using System.ComponentModel.DataAnnotations;

namespace JobTracker.Infrastructure.Identity;

/// <summary>
/// Bound from the "Jwt" configuration section and validated at startup.
/// </summary>
public class JwtOptions
{
    public const string SectionName = "Jwt";

    [Required]
    public string Issuer { get; set; } = string.Empty;

    [Required]
    public string Audience { get; set; } = string.Empty;

    /// <summary>Secret used to sign tokens (HMAC-SHA256). Comes from user secrets / env vars, never from the repo.</summary>
    [Required]
    [MinLength(32, ErrorMessage = "Jwt:SigningKey must be at least 32 characters long.")]
    public string SigningKey { get; set; } = string.Empty;

    [Range(1, 60)]
    public int AccessTokenMinutes { get; set; } = 15;

    [Range(1, 90)]
    public int RefreshTokenDays { get; set; } = 7;

    /// <summary>False only for local HTTP development and tests; browsers send Secure cookies over HTTPS only.</summary>
    public bool SecureRefreshCookie { get; set; } = true;
}
