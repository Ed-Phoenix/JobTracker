using JobTracker.Domain.Enums;

namespace JobTracker.Application.Applications;

/// <summary>
/// Body for both create (POST) and update (PUT).
/// WorkMode, Source and AppliedOn are nullable on purpose: a missing JSON property would otherwise
/// silently become the default value (the first enum member, year 0001). The validator requires them.
/// Status is not here: it only changes through the dedicated status endpoint.
/// </summary>
public record SaveApplicationRequest(
    string Company,
    string Position,
    string? JobUrl,
    string? Location,
    WorkMode? WorkMode,
    decimal? SalaryAmount,
    string? SalaryCurrency,
    DateOnly? AppliedOn,
    ApplicationSource? Source,
    string? Notes);

public record ChangeStatusRequest(ApplicationStatus? Status, string? Note);

/// <summary>
/// Query string of GET /api/applications. A class with setters (not a record) because
/// model binding fills it property by property and the defaults matter.
/// </summary>
public class ApplicationListQuery
{
    public string? Search { get; set; }

    public ApplicationStatus? Status { get; set; }

    public ApplicationSource? Source { get; set; }

    public bool? NeedsFollowUp { get; set; }

    public string SortBy { get; set; } = ApplicationSortFields.AppliedOn;

    public string SortDir { get; set; } = "desc";

    public int Page { get; set; } = 1;

    public int PageSize { get; set; } = 20;
}

/// <summary>
/// Allow-list of sortable columns: the client never sends raw column names to the database.
/// </summary>
public static class ApplicationSortFields
{
    public const string AppliedOn = "appliedOn";
    public const string Company = "company";
    public const string Position = "position";
    public const string Status = "status";
    public const string LastActivityAt = "lastActivityAt";

    public static readonly IReadOnlyList<string> All = [AppliedOn, Company, Position, Status, LastActivityAt];
}

/// <summary>Row of the list: only what the table shows.</summary>
public record ApplicationSummaryResponse(
    Guid Id,
    string Company,
    string Position,
    string? Location,
    WorkMode WorkMode,
    decimal? SalaryAmount,
    string SalaryCurrency,
    DateOnly AppliedOn,
    ApplicationSource Source,
    ApplicationStatus Status,
    DateTimeOffset LastActivityAt,
    bool NeedsFollowUp);

public record StatusChangeResponse(
    Guid Id,
    ApplicationStatus? FromStatus,
    ApplicationStatus ToStatus,
    string? Note,
    DateTimeOffset ChangedAt);

/// <summary>Full application with its status history (newest first).</summary>
public record ApplicationDetailResponse(
    Guid Id,
    string Company,
    string Position,
    string? JobUrl,
    string? Location,
    WorkMode WorkMode,
    decimal? SalaryAmount,
    string SalaryCurrency,
    DateOnly AppliedOn,
    ApplicationSource Source,
    ApplicationStatus Status,
    string? Notes,
    DateTimeOffset LastActivityAt,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    bool NeedsFollowUp,
    IReadOnlyList<StatusChangeResponse> StatusHistory);
