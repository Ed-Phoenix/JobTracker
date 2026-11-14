using JobTracker.Application.Auth;
using JobTracker.Application.Common.Exceptions;
using JobTracker.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace JobTracker.Infrastructure.Identity;

public class AuthService : IAuthService
{
    private const string InvalidCredentials = "Invalid email or password.";
    private const string InvalidRefreshToken = "The session has expired. Please sign in again.";

    private readonly UserManager<ApplicationUser> _userManager;
    private readonly AppDbContext _dbContext;
    private readonly TokenService _tokenService;
    private readonly TimeProvider _timeProvider;
    private readonly JwtOptions _options;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        UserManager<ApplicationUser> userManager,
        AppDbContext dbContext,
        TokenService tokenService,
        TimeProvider timeProvider,
        IOptions<JwtOptions> options,
        ILogger<AuthService> logger)
    {
        _userManager = userManager;
        _dbContext = dbContext;
        _tokenService = tokenService;
        _timeProvider = timeProvider;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<AuthResult> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken)
    {
        ApplicationUser user = new()
        {
            Id = Guid.CreateVersion7(),
            UserName = request.Email,
            Email = request.Email,
            FullName = request.FullName.Trim(),
        };

        // UserManager validates the password rules and stores only a salted hash (PBKDF2).
        IdentityResult result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            throw ToException(result);
        }

        _logger.LogInformation("User {UserId} registered", user.Id);

        return await IssueTokensAsync(user, replacedToken: null, cancellationToken);
    }

    public async Task<AuthResult> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        ApplicationUser? user = await _userManager.FindByEmailAsync(request.Email);

        // Same message for "unknown email" and "wrong password": do not reveal which accounts exist.
        if (user is null || !await _userManager.CheckPasswordAsync(user, request.Password))
        {
            throw new UnauthorizedException(InvalidCredentials);
        }

        return await IssueTokensAsync(user, replacedToken: null, cancellationToken);
    }

    public async Task<AuthResult> RefreshAsync(string? refreshToken, CancellationToken cancellationToken)
    {
        RefreshToken? stored = await FindTokenAsync(refreshToken, cancellationToken);
        if (stored is null)
        {
            throw new UnauthorizedException(InvalidRefreshToken);
        }

        DateTimeOffset now = _timeProvider.GetUtcNow();

        if (stored.IsRevoked)
        {
            // A rotated token was presented again: it may have been stolen.
            // Close every session of the user so the thief's token stops working too.
            _logger.LogWarning("Refresh token reuse detected for user {UserId}", stored.UserId);
            await RevokeAllAsync(stored.UserId, now, cancellationToken);
            throw new UnauthorizedException(InvalidRefreshToken);
        }

        if (stored.IsExpired(now))
        {
            throw new UnauthorizedException(InvalidRefreshToken);
        }

        ApplicationUser user = await _userManager.FindByIdAsync(stored.UserId.ToString())
            ?? throw new UnauthorizedException(InvalidRefreshToken);

        return await IssueTokensAsync(user, replacedToken: stored, cancellationToken);
    }

    public async Task LogoutAsync(string? refreshToken, CancellationToken cancellationToken)
    {
        RefreshToken? stored = await FindTokenAsync(refreshToken, cancellationToken);
        if (stored is null || stored.IsRevoked)
        {
            return; // Logging out twice is not an error (idempotent).
        }

        stored.Revoke(_timeProvider.GetUtcNow());
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<UserResponse> GetProfileAsync(Guid userId, CancellationToken cancellationToken)
    {
        ApplicationUser user = await FindUserAsync(userId);
        return ToResponse(user);
    }

    public async Task<UserResponse> UpdateProfileAsync(Guid userId, UpdateProfileRequest request, CancellationToken cancellationToken)
    {
        ApplicationUser user = await FindUserAsync(userId);

        user.FullName = request.FullName.Trim();
        user.FollowUpDays = request.FollowUpDays;

        IdentityResult result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            throw ToException(result);
        }

        return ToResponse(user);
    }

    private async Task<AuthResult> IssueTokensAsync(ApplicationUser user, RefreshToken? replacedToken, CancellationToken cancellationToken)
    {
        DateTimeOffset now = _timeProvider.GetUtcNow();

        (string accessToken, DateTimeOffset accessExpiresAt) = _tokenService.CreateAccessToken(user);

        // The raw token goes to the client; the database only sees its hash.
        string rawRefreshToken = TokenService.GenerateRefreshToken();
        RefreshToken newToken = new(user.Id, TokenService.Hash(rawRefreshToken), now, now.AddDays(_options.RefreshTokenDays));

        // Rotation: each refresh token works once. Using it revokes it and links it to its replacement.
        replacedToken?.Revoke(now, newToken.TokenHash);

        _dbContext.RefreshTokens.Add(newToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        AuthResponse response = new(accessToken, accessExpiresAt, ToResponse(user));
        return new AuthResult(response, rawRefreshToken, newToken.ExpiresAt);
    }

    private async Task<RefreshToken?> FindTokenAsync(string? refreshToken, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return null;
        }

        string hash = TokenService.Hash(refreshToken);
        return await _dbContext.RefreshTokens.SingleOrDefaultAsync(t => t.TokenHash == hash, cancellationToken);
    }

    private Task<int> RevokeAllAsync(Guid userId, DateTimeOffset now, CancellationToken cancellationToken) =>
        // ExecuteUpdateAsync runs a single UPDATE in the database without loading the rows.
        _dbContext.RefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAt == null)
            .ExecuteUpdateAsync(setters => setters.SetProperty(t => t.RevokedAt, (DateTimeOffset?)now), cancellationToken);

    private async Task<ApplicationUser> FindUserAsync(Guid userId) =>
        await _userManager.FindByIdAsync(userId.ToString())
            ?? throw new UnauthorizedException("The user no longer exists.");

    private static UserResponse ToResponse(ApplicationUser user) =>
        new(user.Id, user.Email ?? string.Empty, user.FullName, user.FollowUpDays);

    private static Exception ToException(IdentityResult result)
    {
        if (result.Errors.Any(e => e.Code is nameof(IdentityErrorDescriber.DuplicateEmail) or nameof(IdentityErrorDescriber.DuplicateUserName)))
        {
            return new ConflictException("An account with this email already exists.");
        }

        // Group Identity errors by field so the client can show them next to the right input.
        Dictionary<string, string[]> errors = result.Errors
            .GroupBy(e => e.Code.StartsWith("Password", StringComparison.Ordinal) ? "password" : "email")
            .ToDictionary(group => group.Key, group => group.Select(e => e.Description).ToArray());

        return new RequestValidationException(errors);
    }
}
