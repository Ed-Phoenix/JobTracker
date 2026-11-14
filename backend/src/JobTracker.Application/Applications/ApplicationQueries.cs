using JobTracker.Domain.Entities;
using JobTracker.Domain.Enums;

namespace JobTracker.Application.Applications;

/// <summary>
/// Reusable query filters. They extend IQueryable, so they become part of the SQL
/// instead of running in memory.
/// </summary>
public static class ApplicationQueries
{
    /// <summary>
    /// Open applications with no activity since <paramref name="cutoff"/>.
    /// Same rule as JobApplication.NeedsFollowUp, but written inline: EF Core can only translate
    /// to SQL what it sees in the expression, not the body of a C# method like IsTerminal().
    /// Keep the three terminal statuses in sync with ApplicationStatusExtensions.IsTerminal.
    /// </summary>
    public static IQueryable<JobApplication> NeedingFollowUp(this IQueryable<JobApplication> applications, DateTimeOffset cutoff) =>
        applications.Where(a =>
            a.Status != ApplicationStatus.Accepted
            && a.Status != ApplicationStatus.Rejected
            && a.Status != ApplicationStatus.NoResponse
            && a.LastActivityAt <= cutoff);

    /// <summary>The exact opposite of <see cref="NeedingFollowUp"/>.</summary>
    public static IQueryable<JobApplication> NotNeedingFollowUp(this IQueryable<JobApplication> applications, DateTimeOffset cutoff) =>
        applications.Where(a =>
            a.Status == ApplicationStatus.Accepted
            || a.Status == ApplicationStatus.Rejected
            || a.Status == ApplicationStatus.NoResponse
            || a.LastActivityAt > cutoff);
}
