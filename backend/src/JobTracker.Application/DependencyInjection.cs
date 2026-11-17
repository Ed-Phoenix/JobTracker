using FluentValidation;
using JobTracker.Application.Applications;
using JobTracker.Application.Applications.Export;
using JobTracker.Application.Dashboard;
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
        // Finds every AbstractValidator<T> in this assembly and registers it as IValidator<T>.
        services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly);

        services.AddScoped<IApplicationsService, ApplicationsService>();

        // Several implementations of one interface: the service receives them all as
        // IEnumerable<IApplicationExportWriter> and picks the one for the requested format.
        services.AddSingleton<IApplicationExportWriter, CsvApplicationExportWriter>();
        services.AddScoped<IDashboardService, DashboardService>();

        return services;
    }
}
