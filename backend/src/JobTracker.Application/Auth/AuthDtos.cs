namespace JobTracker.Application.Auth;

// DTOs (data transfer objects): the shapes the API receives and returns.
// Entities are never exposed directly, so the database model can change without breaking clients.

public record RegisterRequest(string FullName, string Email, string Password);

public record LoginRequest(string Email, string Password);

public record UpdateProfileRequest(string FullName, int FollowUpDays);

public record UserResponse(Guid Id, string Email, string FullName, int FollowUpDays);

public record AuthResponse(string AccessToken, DateTimeOffset ExpiresAt, UserResponse User);

/// <summary>
/// What the auth use cases hand to the controller: the JSON body plus the refresh token,
/// which travels separately in an HttpOnly cookie and never appears in the body.
/// </summary>
public record AuthResult(AuthResponse Response, string RefreshToken, DateTimeOffset RefreshTokenExpiresAt);
