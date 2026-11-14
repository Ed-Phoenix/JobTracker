using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace JobTracker.IntegrationTests;

/// <summary>
/// Boots the API for tests with its own environment and settings,
/// so tests never read the developer's user secrets or touch the dev database.
/// </summary>
public class ApiFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        // Placeholder until the tests get a real PostgreSQL container (Testcontainers).
        builder.UseSetting("ConnectionStrings:Default", "Host=localhost;Database=jobtracker_tests_unused");
    }
}
