using JobTracker.Domain.Enums;

namespace JobTracker.Application.Applications.Export;

/// <summary>One exported application, already in the shape a spreadsheet needs (readable labels, no ids).</summary>
public record ApplicationExportRow(
    string Company,
    string Position,
    string Status,
    string Source,
    string WorkMode,
    string? Location,
    decimal? SalaryAmount,
    string SalaryCurrency,
    DateOnly AppliedOn,
    DateOnly LastActivityOn,
    bool NeedsFollowUp,
    string? JobUrl,
    string? Notes)
{
    /// <summary>Column titles, in the same order as the properties above.</summary>
    public static readonly IReadOnlyList<string> Headers =
    [
        "Company", "Position", "Status", "Source", "Work mode", "Location", "Salary", "Currency",
        "Applied on", "Last activity", "Needs follow-up", "Job URL", "Notes",
    ];
}

/// <summary>A generated file, ready to be sent as an HTTP download.</summary>
public record ExportFile(byte[] Content, string ContentType, string FileName);

/// <summary>
/// Writes rows in one file format. The Application layer defines the contract; each format
/// lives where its dependencies are allowed (CSV here, Excel in Infrastructure with ClosedXML).
/// </summary>
public interface IApplicationExportWriter
{
    ExportFormat Format { get; }

    string ContentType { get; }

    string FileExtension { get; }

    byte[] Write(IReadOnlyList<ApplicationExportRow> rows);
}

/// <summary>Human-readable names for the enums, matching the labels the frontend shows.</summary>
public static class ExportLabels
{
    public static string For(ApplicationStatus status) => status switch
    {
        ApplicationStatus.HrInterview => "HR interview",
        ApplicationStatus.TechnicalInterview => "Technical interview",
        ApplicationStatus.TechnicalTest => "Technical test",
        ApplicationStatus.NoResponse => "No response",
        _ => status.ToString(),
    };

    public static string For(ApplicationSource source) => source switch
    {
        ApplicationSource.Occ => "OCC Mundial",
        ApplicationSource.CompanyWebsite => "Company website",
        _ => source.ToString(),
    };

    public static string For(WorkMode workMode) => workMode switch
    {
        WorkMode.OnSite => "On-site",
        _ => workMode.ToString(),
    };
}
