using JobTracker.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace JobTracker.Application.Abstractions;

/// <summary>
/// What the Application layer needs from the database.
/// Infrastructure implements it with the real DbContext, so use cases never
/// depend on PostgreSQL or Identity details (dependency inversion).
/// </summary>
public interface IAppDbContext
{
    DbSet<JobApplication> JobApplications { get; }

    DbSet<StatusChange> StatusChanges { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
