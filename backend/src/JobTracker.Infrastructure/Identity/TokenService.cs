using System.Buffers.Text;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace JobTracker.Infrastructure.Identity;

public class TokenService
{
    private readonly JwtOptions _options;
    private readonly TimeProvider _timeProvider;

    public TokenService(IOptions<JwtOptions> options, TimeProvider timeProvider)
    {
        _options = options.Value;
        _timeProvider = timeProvider;
    }

    /// <summary>
    /// Access token: a signed JWT. The API validates it on every request without
    /// touching the database, which is why it must be short-lived.
    /// </summary>
    public (string Token, DateTimeOffset ExpiresAt) CreateAccessToken(ApplicationUser user)
    {
        DateTimeOffset now = _timeProvider.GetUtcNow();
        DateTimeOffset expiresAt = now.AddMinutes(_options.AccessTokenMinutes);

        SymmetricSecurityKey key = new(Encoding.UTF8.GetBytes(_options.SigningKey));

        SecurityTokenDescriptor descriptor = new()
        {
            Issuer = _options.Issuer,
            Audience = _options.Audience,
            Subject = new ClaimsIdentity(
            [
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            ]),
            IssuedAt = now.UtcDateTime,
            NotBefore = now.UtcDateTime,
            Expires = expiresAt.UtcDateTime,
            SigningCredentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256),
        };

        return (new JsonWebTokenHandler().CreateToken(descriptor), expiresAt);
    }

    /// <summary>
    /// Refresh token: an opaque random string (not a JWT). It has no meaning by itself;
    /// it is only valid if its hash exists in the database.
    /// </summary>
    public static string GenerateRefreshToken() =>
        Base64Url.EncodeToString(RandomNumberGenerator.GetBytes(64));

    public static string Hash(string refreshToken) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(refreshToken)));
}
