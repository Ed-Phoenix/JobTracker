using JobTracker.Domain.Enums;

namespace JobTracker.Domain.Entities;

/// <summary>
/// The user-editable fields of a job application, grouped so that creating and
/// updating share one parameter instead of ten.
/// </summary>
public record JobApplicationDetails(
    string Company,
    string Position,
    string? JobUrl,
    string? Location,
    WorkMode WorkMode,
    decimal? SalaryAmount,
    string SalaryCurrency,
    DateOnly AppliedOn,
    ApplicationSource Source,
    string? Notes);
