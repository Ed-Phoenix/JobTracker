using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Testcontainers.PostgreSql;

namespace JobTracker.IntegrationTests;

/// <summary>
/// Boots the real API in memory against a real PostgreSQL running in a throwaway Docker
/// container (Testcontainers). Tests exercise the same SQL and constraints as production
/// and never touch the developer's database or user secrets.
/// </summary>
public class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _database = new PostgreSqlBuilder("postgres:17-alpine").Build();

    // xUnit calls this once, before the first test that uses the fixture.
    public Task InitializeAsync() => _database.StartAsync();

    // Explicit implementation: WebApplicationFactory already has a DisposeAsync with another return type.
    async Task IAsyncLifetime.DisposeAsync()
    {
        await base.DisposeAsync();
        await _database.DisposeAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.UseSetting("ConnectionStrings:Default", _database.GetConnectionString());
        builder.UseSetting("Database:MigrateOnStartup", "true");
        builder.UseSetting("Jwt:SigningKey", "integration-tests-signing-key-0123456789abcdef");
        builder.UseSetting("Jwt:SecureRefreshCookie", "false");
        builder.UseSetting("RateLimiting:AuthPermitLimit", "10000");
    }
}

/// <summary>
/// Test classes marked with [Collection(ApiCollection.Name)] share one ApiFactory,
/// so the container starts only once for the whole test run.
/// </summary>
[CollectionDefinition(Name)]
public class ApiCollection : ICollectionFixture<ApiFactory>
{
    public const string Name = "Api";
}
