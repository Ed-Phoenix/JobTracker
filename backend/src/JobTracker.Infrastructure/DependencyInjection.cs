using JobTracker.Application.Abstractions;
using JobTracker.Infrastructure.Identity;
using JobTracker.Infrastructure.Persistence;
using JobTracker.Infrastructure.Persistence.Seed;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace JobTracker.Infrastructure;

public static class DependencyInjection
{
    /// <summary>
    /// Registers the Infrastructure layer services (database, identity, tokens).
    /// Receives the configuration because this layer reads connection strings and secrets.
    /// </summary>
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        // Fail fast: a missing connection string should stop the app at startup, not on the first request.
        string connectionString = configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException("Connection string 'Default' is not configured.");

        // AddDbContext registers AppDbContext as scoped: one instance per HTTP request.
        services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));
        services.AddScoped<IAppDbContext>(provider => provider.GetRequiredService<AppDbContext>());

        services
            .AddIdentityCore<ApplicationUser>(options =>
            {
                options.User.RequireUniqueEmail = true;
                options.Password.RequiredLength = 8;
            })
            .AddEntityFrameworkStores<AppDbContext>();

        services.AddSingleton(TimeProvider.System);

        services.Configure<SeedOptions>(configuration.GetSection(SeedOptions.SectionName));
        services.AddScoped<DemoDataSeeder>();

        return services;
    }
}
