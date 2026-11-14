using JobTracker.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JobTracker.Infrastructure.Persistence.Configurations;

public class StatusChangeConfiguration : IEntityTypeConfiguration<StatusChange>
{
    public void Configure(EntityTypeBuilder<StatusChange> builder)
    {
        builder.ToTable("StatusChanges");

        builder.HasKey(s => s.Id);

        // The id is generated in the domain (Guid v7), not by the database.
        builder.Property(s => s.Id).ValueGeneratedNever();

        // Stored as text, same as JobApplication.Status. FromStatus stays nullable (first row).
        builder.Property(s => s.FromStatus).HasConversion<string>().HasMaxLength(32);
        builder.Property(s => s.ToStatus).HasConversion<string>().HasMaxLength(32);

        builder.Property(s => s.Note).HasMaxLength(1000);

        // The history is always read per application, ordered by date.
        // The relationship itself is configured in JobApplicationConfiguration.
        builder.HasIndex(s => new { s.JobApplicationId, s.ChangedAt });
    }
}
