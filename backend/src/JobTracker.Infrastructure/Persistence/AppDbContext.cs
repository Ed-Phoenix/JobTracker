using JobTracker.Application.Abstractions;
using JobTracker.Domain.Entities;
using JobTracker.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace JobTracker.Infrastructure.Persistence;

/// <summary>
/// IdentityUserContext adds the Identity user tables (no roles: the app does not need them).
/// </summary>
public class AppDbContext : IdentityUserContext<ApplicationUser, Guid>, IAppDbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<JobApplication> JobApplications => Set<JobApplication>();

    public DbSet<StatusChange> StatusChanges => Set<StatusChange>();

    // Not part of IAppDbContext: refresh tokens are an Infrastructure detail.
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Picks up every IEntityTypeConfiguration<T> class in this assembly (see Configurations/).
        builder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
