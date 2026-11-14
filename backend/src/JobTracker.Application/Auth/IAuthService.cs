namespace JobTracker.Application.Auth;

/// <summary>
/// Auth use cases. Implemented in Infrastructure because it needs ASP.NET Core Identity.
/// </summary>
public interface IAuthService
{
    Task<AuthResult> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken);

    Task<AuthResult> LoginAsync(LoginRequest request, CancellationToken cancellationToken);

    /// <summary>Exchanges a valid refresh token for a new access token and a new refresh token (rotation).</summary>
    Task<AuthResult> RefreshAsync(string? refreshToken, CancellationToken cancellationToken);

    Task LogoutAsync(string? refreshToken, CancellationToken cancellationToken);

    Task<UserResponse> GetProfileAsync(Guid userId, CancellationToken cancellationToken);

    Task<UserResponse> UpdateProfileAsync(Guid userId, UpdateProfileRequest request, CancellationToken cancellationToken);
}
