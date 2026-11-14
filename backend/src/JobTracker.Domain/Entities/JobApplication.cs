using JobTracker.Domain.Enums;
using JobTracker.Domain.Exceptions;

namespace JobTracker.Domain.Entities;

/// <summary>
/// A job application owned by one user.
/// Setters are private: state only changes through the methods below,
/// so the business rules cannot be bypassed from other layers.
/// </summary>
public class JobApplication
{
    private readonly List<StatusChange> _statusHistory = [];

    // Required by EF Core to materialize the entity from the database.
    private JobApplication()
    {
    }

    public Guid Id { get; private set; }

    public Guid UserId { get; private set; }

    public string Company { get; private set; } = string.Empty;

    public string Position { get; private set; } = string.Empty;

    public string? JobUrl { get; private set; }

    public string? Location { get; private set; }

    public WorkMode WorkMode { get; private set; }

    public decimal? SalaryAmount { get; private set; }

    public string SalaryCurrency { get; private set; } = "MXN";

    public DateOnly AppliedOn { get; private set; }

    public ApplicationSource Source { get; private set; }

    public ApplicationStatus Status { get; private set; }

    public string? Notes { get; private set; }

    /// <summary>Last status change. Drives the follow-up reminders.</summary>
    public DateTimeOffset LastActivityAt { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public DateTimeOffset UpdatedAt { get; private set; }

    public IReadOnlyCollection<StatusChange> StatusHistory => _statusHistory.AsReadOnly();

    public static JobApplication Create(Guid userId, JobApplicationDetails details, DateTimeOffset now)
    {
        if (userId == Guid.Empty)
        {
            throw new DomainException("A job application must belong to a user.");
        }

        JobApplication application = new()
        {
            Id = Guid.CreateVersion7(),
            UserId = userId,
            Status = ApplicationStatus.Applied,
            LastActivityAt = now,
            CreatedAt = now,
            UpdatedAt = now,
        };

        application.ApplyDetails(details);
        application._statusHistory.Add(
            new StatusChange(application.Id, fromStatus: null, ApplicationStatus.Applied, note: null, now));

        return application;
    }

    public void UpdateDetails(JobApplicationDetails details, DateTimeOffset now)
    {
        ApplyDetails(details);
        UpdatedAt = now;
    }

    /// <summary>
    /// Moves the application to a new status and records the change in the history.
    /// Real hiring processes skip stages, so no strict order is enforced. The rules are:
    /// the status must actually change, and an application can only be accepted from an offer.
    /// </summary>
    public void ChangeStatus(ApplicationStatus newStatus, string? note, DateTimeOffset now)
    {
        if (newStatus == Status)
        {
            throw new DomainException($"The application is already in status '{Status}'.");
        }

        if (newStatus == ApplicationStatus.Accepted && Status != ApplicationStatus.Offer)
        {
            throw new DomainException("An application can only be accepted after receiving an offer.");
        }

        _statusHistory.Add(new StatusChange(Id, Status, newStatus, note, now));

        Status = newStatus;
        LastActivityAt = now;
        UpdatedAt = now;
    }

    /// <summary>
    /// True when the process is still open and nothing has happened for at least <paramref name="followUpDays"/> days.
    /// </summary>
    public bool NeedsFollowUp(int followUpDays, DateTimeOffset now) =>
        !Status.IsTerminal() && LastActivityAt <= now.AddDays(-followUpDays);

    private void ApplyDetails(JobApplicationDetails details)
    {
        if (string.IsNullOrWhiteSpace(details.Company))
        {
            throw new DomainException("Company is required.");
        }

        if (string.IsNullOrWhiteSpace(details.Position))
        {
            throw new DomainException("Position is required.");
        }

        if (details.SalaryAmount is < 0)
        {
            throw new DomainException("Salary cannot be negative.");
        }

        Company = details.Company.Trim();
        Position = details.Position.Trim();
        JobUrl = NullIfBlank(details.JobUrl);
        Location = NullIfBlank(details.Location);
        WorkMode = details.WorkMode;
        SalaryAmount = details.SalaryAmount;
        SalaryCurrency = details.SalaryCurrency.Trim().ToUpperInvariant();
        AppliedOn = details.AppliedOn;
        Source = details.Source;
        Notes = NullIfBlank(details.Notes);
    }

    private static string? NullIfBlank(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
