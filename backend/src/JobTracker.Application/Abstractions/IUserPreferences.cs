namespace JobTracker.Application.Abstractions;

/// <summary>
/// Per-user settings the use cases need. The user table belongs to Identity (Infrastructure),
/// so Application reads it through this interface.
/// </summary>
public interface IUserPreferences
{
    /// <summary>Days without activity before an open application needs a follow-up.</summary>
    Task<int> GetFollowUpDaysAsync(Guid userId, CancellationToken cancellationToken);
}
