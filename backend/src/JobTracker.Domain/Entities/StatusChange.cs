using JobTracker.Domain.Enums;

namespace JobTracker.Domain.Entities;

/// <summary>
/// One row of the status history. It is immutable: history is only ever appended.
/// </summary>
public class StatusChange
{
    // Required by EF Core to materialize the entity from the database.
    private StatusChange()
    {
    }

    // Internal: only JobApplication (same assembly) can create history rows.
    internal StatusChange(
        Guid jobApplicationId,
        ApplicationStatus? fromStatus,
        ApplicationStatus toStatus,
        string? note,
        DateTimeOffset changedAt)
    {
        Id = Guid.CreateVersion7();
        JobApplicationId = jobApplicationId;
        FromStatus = fromStatus;
        ToStatus = toStatus;
        Note = string.IsNullOrWhiteSpace(note) ? null : note.Trim();
        ChangedAt = changedAt;
    }

    public Guid Id { get; private set; }

    public Guid JobApplicationId { get; private set; }

    /// <summary>Null for the first row, written when the application is created.</summary>
    public ApplicationStatus? FromStatus { get; private set; }

    public ApplicationStatus ToStatus { get; private set; }

    public string? Note { get; private set; }

    public DateTimeOffset ChangedAt { get; private set; }
}
