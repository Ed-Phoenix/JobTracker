using JobTracker.Application.Abstractions;
using JobTracker.Application.Auth;
using JobTracker.Infrastructure.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;

namespace JobTracker.Api.Controllers;

/// <summary>
/// The controller only translates HTTP: it reads the request, calls the use case and shapes the response.
/// </summary>
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    public const string RefreshCookieName = "jobtracker_refresh";

    // The cookie is only sent to the auth endpoints, not with every API call.
    private const string RefreshCookiePath = "/api/auth";

    private readonly IAuthService _authService;
    private readonly ICurrentUser _currentUser;
    private readonly JwtOptions _jwtOptions;

    public AuthController(IAuthService authService, ICurrentUser currentUser, IOptions<JwtOptions> jwtOptions)
    {
        _authService = authService;
        _currentUser = currentUser;
        _jwtOptions = jwtOptions.Value;
    }

    [HttpPost("register")]
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    [ProducesResponseType<AuthResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request, CancellationToken cancellationToken)
    {
        AuthResult result = await _authService.RegisterAsync(request, cancellationToken);
        return OkWithRefreshCookie(result);
    }

    [HttpPost("login")]
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    [ProducesResponseType<AuthResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request, CancellationToken cancellationToken)
    {
        AuthResult result = await _authService.LoginAsync(request, cancellationToken);
        return OkWithRefreshCookie(result);
    }

    /// <summary>Uses the refresh cookie to issue a new access token. No request body.</summary>
    [HttpPost("refresh")]
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    [ProducesResponseType<AuthResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AuthResponse>> Refresh(CancellationToken cancellationToken)
    {
        AuthResult result = await _authService.RefreshAsync(Request.Cookies[RefreshCookieName], cancellationToken);
        return OkWithRefreshCookie(result);
    }

    /// <summary>
    /// Not [Authorize]: the access token may already be expired when the user signs out.
    /// The refresh cookie identifies the session to close.
    /// </summary>
    [HttpPost("logout")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Logout(CancellationToken cancellationToken)
    {
        await _authService.LogoutAsync(Request.Cookies[RefreshCookieName], cancellationToken);

        // A cookie is deleted by sending it again, already expired, with the same path.
        Response.Cookies.Delete(RefreshCookieName, BuildCookieOptions(expires: null));
        return NoContent();
    }

    [Authorize]
    [HttpGet("me")]
    [ProducesResponseType<UserResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<UserResponse>> GetProfile(CancellationToken cancellationToken)
    {
        return await _authService.GetProfileAsync(_currentUser.UserId, cancellationToken);
    }

    [Authorize]
    [HttpPatch("me")]
    [ProducesResponseType<UserResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<UserResponse>> UpdateProfile(UpdateProfileRequest request, CancellationToken cancellationToken)
    {
        return await _authService.UpdateProfileAsync(_currentUser.UserId, request, cancellationToken);
    }

    private ActionResult<AuthResponse> OkWithRefreshCookie(AuthResult result)
    {
        Response.Cookies.Append(RefreshCookieName, result.RefreshToken, BuildCookieOptions(result.RefreshTokenExpiresAt));
        return result.Response;
    }

    private CookieOptions BuildCookieOptions(DateTimeOffset? expires) => new()
    {
        HttpOnly = true,                 // JavaScript cannot read it (protects against XSS token theft).
        Secure = _jwtOptions.SecureRefreshCookie, // HTTPS only.
        SameSite = SameSiteMode.Strict,  // Never sent on cross-site requests (protects against CSRF).
        Path = RefreshCookiePath,
        Expires = expires,
    };
}
