using JobTracker.Domain.Entities;
using JobTracker.Domain.Enums;

namespace JobTracker.Application.Applications;

/// <summary>
/// Manual entity/DTO mapping: explicit, easy to debug, and the compiler
/// complains if a property is forgotten.
/// </summary>
internal static class ApplicationMappings
{
    public static JobApplicationDetails ToDetails(this SaveApplicationRequest request) => new(
        request.Company,
        request.Position,
        request.JobUrl,
        request.Location,
        request.WorkMode ?? WorkMode.OnSite,       // Never null here: the validator ran first.
        request.SalaryAmount,
        string.IsNullOrWhiteSpace(request.SalaryCurrency) ? "MXN" : request.SalaryCurrency,
        request.AppliedOn ?? default,
        request.Source ?? ApplicationSource.Other,
        request.Notes);

    public static ApplicationSummaryResponse ToSummary(this JobApplication application, int followUpDays, DateTimeOffset now) => new(
        application.Id,
        application.Company,
        application.Position,
        application.Location,
        application.WorkMode,
        application.SalaryAmount,
        application.SalaryCurrency,
        application.AppliedOn,
        application.Source,
        application.Status,
        application.LastActivityAt,
        application.NeedsFollowUp(followUpDays, now));

    public static ApplicationDetailResponse ToDetail(this JobApplication application, int followUpDays, DateTimeOffset now) => new(
        application.Id,
        application.Company,
        application.Position,
        application.JobUrl,
        application.Location,
        application.WorkMode,
        application.SalaryAmount,
        application.SalaryCurrency,
        application.AppliedOn,
        application.Source,
        application.Status,
        application.Notes,
        application.LastActivityAt,
        application.CreatedAt,
        application.UpdatedAt,
        application.NeedsFollowUp(followUpDays, now),
        application.StatusHistory
            .OrderByDescending(change => change.ChangedAt)
            .Select(change => new StatusChangeResponse(change.Id, change.FromStatus, change.ToStatus, change.Note, change.ChangedAt))
            .ToList());
}
