using JobTracker.Application.Abstractions;
using JobTracker.Application.Common;
using JobTracker.Application.Common.Exceptions;
using JobTracker.Domain.Entities;
using JobTracker.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace JobTracker.Application.Applications;

public class ApplicationsService : IApplicationsService
{
    private readonly IAppDbContext _dbContext;
    private readonly ICurrentUser _currentUser;
    private readonly IUserPreferences _userPreferences;
    private readonly TimeProvider _timeProvider;

    public ApplicationsService(
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

    public async Task<PagedResult<ApplicationSummaryResponse>> ListAsync(ApplicationListQuery query, CancellationToken cancellationToken)
    {
        Guid userId = _currentUser.UserId;
        DateTimeOffset now = _timeProvider.GetUtcNow();
        int followUpDays = await _userPreferences.GetFollowUpDaysAsync(userId, cancellationToken);

        // IQueryable is a query being built, not data: nothing is sent to the database
        // until CountAsync / ToListAsync below (deferred execution).
        // AsNoTracking: read-only query, so EF skips change tracking (faster, less memory).
        IQueryable<JobApplication> applications = _dbContext.JobApplications
            .AsNoTracking()
            .Where(a => a.UserId == userId);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            // Translates to: lower("Company") LIKE '%term%'. The term travels as a SQL
            // parameter (no SQL injection) and EF escapes the LIKE wildcards in it.
            string term = query.Search.Trim().ToLower();
            applications = applications.Where(a => a.Company.ToLower().Contains(term) || a.Position.ToLower().Contains(term));
        }

        if (query.Status is not null)
        {
            applications = applications.Where(a => a.Status == query.Status);
        }

        if (query.Source is not null)
        {
            applications = applications.Where(a => a.Source == query.Source);
        }

        if (query.NeedsFollowUp is not null)
        {
            // Same rule as JobApplication.NeedsFollowUp, but written inline: EF Core can only translate
            // to SQL what it sees in the expression, not the body of a C# method like IsTerminal().
            // Keep the three terminal statuses in sync with ApplicationStatusExtensions.IsTerminal.
            DateTimeOffset cutoff = now.AddDays(-followUpDays);
            applications = query.NeedsFollowUp.Value
                ? applications.Where(a =>
                    a.Status != ApplicationStatus.Accepted
                    && a.Status != ApplicationStatus.Rejected
                    && a.Status != ApplicationStatus.NoResponse
                    && a.LastActivityAt <= cutoff)
                : applications.Where(a =>
                    a.Status == ApplicationStatus.Accepted
                    || a.Status == ApplicationStatus.Rejected
                    || a.Status == ApplicationStatus.NoResponse
                    || a.LastActivityAt > cutoff);
        }

        int totalCount = await applications.CountAsync(cancellationToken);

        List<JobApplication> page = await Sort(applications, query.SortBy, query.SortDir)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(cancellationToken);

        List<ApplicationSummaryResponse> items = page.Select(a => a.ToSummary(followUpDays, now)).ToList();

        return new PagedResult<ApplicationSummaryResponse>(items, query.Page, query.PageSize, totalCount);
    }

    public async Task<ApplicationDetailResponse> GetAsync(Guid id, CancellationToken cancellationToken)
    {
        JobApplication application = await FindOwnedAsync(id, cancellationToken);
        return await ToDetailAsync(application, cancellationToken);
    }

    public async Task<ApplicationDetailResponse> CreateAsync(SaveApplicationRequest request, CancellationToken cancellationToken)
    {
        // The owner always comes from the token, never from the request body.
        JobApplication application = JobApplication.Create(_currentUser.UserId, request.ToDetails(), _timeProvider.GetUtcNow());

        _dbContext.JobApplications.Add(application);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return await ToDetailAsync(application, cancellationToken);
    }

    public async Task<ApplicationDetailResponse> UpdateAsync(Guid id, SaveApplicationRequest request, CancellationToken cancellationToken)
    {
        JobApplication application = await FindOwnedAsync(id, cancellationToken);

        // The entity is tracked: EF detects which properties changed and updates only those columns.
        application.UpdateDetails(request.ToDetails(), _timeProvider.GetUtcNow());
        await _dbContext.SaveChangesAsync(cancellationToken);

        return await ToDetailAsync(application, cancellationToken);
    }

    public async Task<ApplicationDetailResponse> ChangeStatusAsync(Guid id, ChangeStatusRequest request, CancellationToken cancellationToken)
    {
        JobApplication application = await FindOwnedAsync(id, cancellationToken);

        // The domain enforces the rules and throws DomainException (-> 409) if the change is not allowed.
        // The new history row and the updated application are saved in one transaction.
        application.ChangeStatus(request.Status ?? default, request.Note, _timeProvider.GetUtcNow());
        await _dbContext.SaveChangesAsync(cancellationToken);

        return await ToDetailAsync(application, cancellationToken);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        JobApplication application = await FindOwnedAsync(id, cancellationToken);

        // The status history is not removed by hand: the foreign key is configured with
        // ON DELETE CASCADE, so the database deletes those rows together with the application.
        _dbContext.JobApplications.Remove(application);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Loads an application only if it belongs to the current user. A foreign id gives the
    /// same 404 as a non-existent one, so nobody can probe which ids exist.
    /// </summary>
    private async Task<JobApplication> FindOwnedAsync(Guid id, CancellationToken cancellationToken)
    {
        Guid userId = _currentUser.UserId;

        // Include loads the history in the same query (a JOIN), avoiding a second round trip.
        return await _dbContext.JobApplications
                .Include(a => a.StatusHistory)
                .SingleOrDefaultAsync(a => a.Id == id && a.UserId == userId, cancellationToken)
            ?? throw new NotFoundException("Job application not found.");
    }

    private async Task<ApplicationDetailResponse> ToDetailAsync(JobApplication application, CancellationToken cancellationToken)
    {
        int followUpDays = await _userPreferences.GetFollowUpDaysAsync(application.UserId, cancellationToken);
        return application.ToDetail(followUpDays, _timeProvider.GetUtcNow());
    }

    private static IQueryable<JobApplication> Sort(IQueryable<JobApplication> applications, string sortBy, string sortDir)
    {
        bool descending = sortDir.Equals("desc", StringComparison.OrdinalIgnoreCase);

        IOrderedQueryable<JobApplication> ordered = sortBy.ToLowerInvariant() switch
        {
            "company" => descending ? applications.OrderByDescending(a => a.Company) : applications.OrderBy(a => a.Company),
            "position" => descending ? applications.OrderByDescending(a => a.Position) : applications.OrderBy(a => a.Position),
            "status" => descending ? applications.OrderByDescending(a => a.Status) : applications.OrderBy(a => a.Status),
            "lastactivityat" => descending ? applications.OrderByDescending(a => a.LastActivityAt) : applications.OrderBy(a => a.LastActivityAt),
            _ => descending ? applications.OrderByDescending(a => a.AppliedOn) : applications.OrderBy(a => a.AppliedOn),
        };

        // Tie-breaker: without a unique last key, rows with equal values could repeat or vanish between pages.
        return ordered.ThenBy(a => a.Id);
    }
}
