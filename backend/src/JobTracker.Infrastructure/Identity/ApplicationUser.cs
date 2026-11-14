using Microsoft.AspNetCore.Identity;

namespace JobTracker.Infrastructure.Identity;

/// <summary>
/// The app's user. IdentityUser already brings email, password hash, lockout, etc.
/// It lives in Infrastructure because it depends on ASP.NET Core Identity;
/// the Domain only knows users by their Guid id.
/// </summary>
public class ApplicationUser : IdentityUser<Guid>
{
    public const int DefaultFollowUpDays = 7;

    public string FullName { get; set; } = string.Empty;

    /// <summary>Days without activity before an open application is flagged for follow-up.</summary>
    public int FollowUpDays { get; set; } = DefaultFollowUpDays;
}
