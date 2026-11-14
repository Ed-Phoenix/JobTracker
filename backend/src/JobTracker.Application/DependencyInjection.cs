using Microsoft.Extensions.DependencyInjection;

namespace JobTracker.Application;

public static class DependencyInjection
{
    /// <summary>
    /// Registers the Application layer services (use cases, validators).
    /// Each layer owns its registrations so Program.cs stays short.
    /// </summary>
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        return services;
    }
}
