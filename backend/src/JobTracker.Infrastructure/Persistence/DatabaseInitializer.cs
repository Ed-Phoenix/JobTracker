using JobTracker.Infrastructure.Persistence.Seed;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace JobTracker.Infrastructure.Persistence;

public static class DatabaseInitializer
{
    /// <summary>
    /// Runs once at startup. Both steps are opt-in through configuration:
    /// Database:MigrateOnStartup applies pending migrations, Seed:Enabled loads the demo data.
    /// </summary>
    public static async Task InitializeDatabaseAsync(this IServiceProvider services)
    {
        // DbContext is a scoped service; at startup there is no HTTP request, so we create a scope by hand.
        await using AsyncServiceScope scope = services.CreateAsyncScope();
        IServiceProvider provider = scope.ServiceProvider;

        IConfiguration configuration = provider.GetRequiredService<IConfiguration>();
        if (configuration.GetValue<bool>("Database:MigrateOnStartup"))
        {
            await provider.GetRequiredService<AppDbContext>().Database.MigrateAsync();
        }

        if (provider.GetRequiredService<IOptions<SeedOptions>>().Value.Enabled)
        {
            await provider.GetRequiredService<DemoDataSeeder>().SeedAsync();
        }
    }
}
