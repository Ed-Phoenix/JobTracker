using JobTracker.Application.Abstractions;
using JobTracker.Application.Applications;
using JobTracker.Domain.Entities;
using JobTracker.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace JobTracker.Application.Dashboard;

public interface IDashboardService
{
    Task<DashboardSummaryResponse> GetSummaryAsync(CancellationToken cancellationToken);
}

/// <summary>
/// Every number here is computed by the database (COUNT / GROUP BY). The API never loads
/// the user's applications into memory just to count them.
/// </summary>
public class DashboardService : IDashboardService
{
    private const int WeeksInChart = 12;

    private readonly IAppDbContext _dbContext;
    private readonly ICurrentUser _currentUser;
    private readonly IUserPreferences _userPreferences;
    private readonly TimeProvider _timeProvider;

    public DashboardService(
        IAppDbContext dbContext,
        ICurrentUser currentUser,
        IUserPreferences userPreferences,
        TimeProvider timeProvider)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
        _userPreferences = userPreferences;
        _timeProvider = timeProvider;
    }

    public async Task<DashboardSummaryResponse> GetSummaryAsync(CancellationToken cancellationToken)
    {
        Guid userId = _currentUser.UserId;
        DateTimeOffset now = _timeProvider.GetUtcNow();

        IQueryable<JobApplication> applications = _dbContext.JobApplications
            .AsNoTracking()
            .Where(a => a.UserId == userId);

        int total = await applications.CountAsync(cancellationToken);

        // "Responded" = the company answered at some point, even if the process later went quiet.
        // That is why this looks at the history (any change to a status other than Applied / NoResponse)
        // and not at the current status. Translates to a COUNT with an EXISTS subquery.
        int responded = await applications.CountAsync(
            a => a.StatusHistory.Any(change =>
                change.ToStatus != ApplicationStatus.Applied && change.ToStatus != ApplicationStatus.NoResponse),
            cancellationToken);

        Dictionary<ApplicationStatus, int> countsByStatus = await CountByStatusAsync(applications, cancellationToken);

        int followUpDays = await _userPreferences.GetFollowUpDaysAsync(userId, cancellationToken);
        int needsFollowUp = await applications
            .NeedingFollowUp(now.AddDays(-followUpDays))
            .CountAsync(cancellationToken);

        return new DashboardSummaryResponse(
            total,
            ResponseRate: total == 0 ? 0 : Math.Round(responded / (double)total, 4),
            // Every status appears, in pipeline order, so the chart always has the same bars.
            ByStatus: Enum.GetValues<ApplicationStatus>()
                .Select(status => new StatusCount(status, countsByStatus.GetValueOrDefault(status)))
                .ToList(),
            PerWeek: await CountPerWeekAsync(applications, now, cancellationToken),
            needsFollowUp);
    }

    private static async Task<Dictionary<ApplicationStatus, int>> CountByStatusAsync(
        IQueryable<JobApplication> applications, CancellationToken cancellationToken)
    {
        // SQL: SELECT "Status", COUNT(*) FROM "JobApplications" WHERE "UserId" = @userId GROUP BY "Status"
        // Only one small row per status travels from the database. Statuses without
        // applications are simply absent; the caller fills them in with zero.
        return await applications
            .GroupBy(a => a.Status)
            .Select(group => new { Status = group.Key, Count = group.Count() })
            .ToDictionaryAsync(row => row.Status, row => row.Count, cancellationToken);
    }

    private static async Task<IReadOnlyList<WeekCount>> CountPerWeekAsync(
        IQueryable<JobApplication> applications, DateTimeOffset now, CancellationToken cancellationToken)
    {
        DateOnly today = DateOnly.FromDateTime(now.UtcDateTime);
        DateOnly windowStart = WeeklyBuckets.WindowStart(today, WeeksInChart);

        // The database groups by day (at most 84 small rows come back); the days are then
        // bucketed into weeks in memory. Grouping by week in SQL needs date_trunc, which is
        // PostgreSQL-specific and would tie this layer to the database provider.
        Dictionary<DateOnly, int> countsByDate = await applications
            .Where(a => a.AppliedOn >= windowStart)
            .GroupBy(a => a.AppliedOn)
            .Select(group => new { Date = group.Key, Count = group.Count() })
            .ToDictionaryAsync(row => row.Date, row => row.Count, cancellationToken);

        return WeeklyBuckets.Build(countsByDate, today, WeeksInChart);
    }
}
