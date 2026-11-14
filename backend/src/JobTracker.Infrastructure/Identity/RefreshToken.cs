namespace JobTracker.Infrastructure.Identity;

/// <summary>
/// A refresh token as stored in the database. Only the SHA-256 hash is kept:
/// if the table leaks, the hashes cannot be used to obtain access tokens.
/// </summary>
public class RefreshToken
{
    // Required by EF Core.
    private RefreshToken()
    {
    }

    public RefreshToken(Guid userId, string tokenHash, DateTimeOffset createdAt, DateTimeOffset expiresAt)
    {
        Id = Guid.CreateVersion7();
        UserId = userId;
        TokenHash = tokenHash;
        CreatedAt = createdAt;
        ExpiresAt = expiresAt;
    }

    public Guid Id { get; private set; }

    public Guid UserId { get; private set; }

    public string TokenHash { get; private set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; private set; }

    public DateTimeOffset ExpiresAt { get; private set; }

    public DateTimeOffset? RevokedAt { get; private set; }

    /// <summary>Set when the token was rotated: points to the token that replaced it.</summary>
    public string? ReplacedByTokenHash { get; private set; }

    public bool IsRevoked => RevokedAt is not null;

    public bool IsExpired(DateTimeOffset now) => ExpiresAt <= now;

    public void Revoke(DateTimeOffset now, string? replacedByTokenHash = null)
    {
        RevokedAt = now;
        ReplacedByTokenHash = replacedByTokenHash;
    }
}
