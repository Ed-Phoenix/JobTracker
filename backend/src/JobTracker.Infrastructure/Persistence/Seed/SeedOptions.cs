namespace JobTracker.Infrastructure.Persistence.Seed;

/// <summary>
/// Bound from the "Seed" configuration section (appsettings, user secrets or env vars).
/// </summary>
public class SeedOptions
{
    public const string SectionName = "Seed";

    public bool Enabled { get; set; }

    public string DemoEmail { get; set; } = "demo@jobtracker.dev";

    /// <summary>Never committed: comes from user secrets locally and env vars elsewhere.</summary>
    public string? DemoPassword { get; set; }
}
