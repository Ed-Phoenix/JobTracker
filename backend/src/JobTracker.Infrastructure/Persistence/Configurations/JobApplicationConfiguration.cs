using JobTracker.Domain.Entities;
using JobTracker.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JobTracker.Infrastructure.Persistence.Configurations;

/// <summary>
/// Fluent API mapping for JobApplication. Keeping it here (instead of attributes on
/// the entity) leaves the Domain free of any EF Core reference.
/// </summary>
public class JobApplicationConfiguration : IEntityTypeConfiguration<JobApplication>
{
    public void Configure(EntityTypeBuilder<JobApplication> builder)
    {
        builder.ToTable("JobApplications");

        builder.HasKey(a => a.Id);

        // The id is generated in the domain (Guid v7), not by the database.
        builder.Property(a => a.Id).ValueGeneratedNever();

        builder.Property(a => a.Company).HasMaxLength(200).IsRequired();
        builder.Property(a => a.Position).HasMaxLength(200).IsRequired();
        builder.Property(a => a.JobUrl).HasMaxLength(2048);
        builder.Property(a => a.Location).HasMaxLength(200);
        builder.Property(a => a.Notes).HasMaxLength(4000);

        // Enums are stored as text: readable in SQL and safe if the enum is reordered.
        builder.Property(a => a.WorkMode).HasConversion<string>().HasMaxLength(32);
        builder.Property(a => a.Source).HasConversion<string>().HasMaxLength(32);
        builder.Property(a => a.Status).HasConversion<string>().HasMaxLength(32);

        builder.Property(a => a.SalaryAmount).HasPrecision(12, 2);
        builder.Property(a => a.SalaryCurrency).HasMaxLength(3).IsFixedLength().IsRequired();

        // Owner: deleting a user deletes their applications.
        builder.HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(a => a.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // History: EF writes to the private _statusHistory field behind the read-only property.
        builder.HasMany(a => a.StatusHistory)
            .WithOne()
            .HasForeignKey(s => s.JobApplicationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Navigation(a => a.StatusHistory).UsePropertyAccessMode(PropertyAccessMode.Field);

        // Indexes for the queries the app runs most: always filtered by user.
        builder.HasIndex(a => new { a.UserId, a.Status });
        builder.HasIndex(a => new { a.UserId, a.AppliedOn });
        builder.HasIndex(a => new { a.UserId, a.LastActivityAt });
    }
}
