namespace JobTracker.Domain.Enums;

public enum ApplicationStatus
{
    Applied,
    HrInterview,
    TechnicalInterview,
    TechnicalTest,
    Offer,
    Accepted,
    Rejected,
    NoResponse,
}

public static class ApplicationStatusExtensions
{
    /// <summary>
    /// Terminal statuses close the process: they are excluded from follow-up reminders.
    /// </summary>
    public static bool IsTerminal(this ApplicationStatus status) =>
        status is ApplicationStatus.Accepted or ApplicationStatus.Rejected or ApplicationStatus.NoResponse;
}
