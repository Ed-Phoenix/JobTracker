using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using JobTracker.Api.Filters;
using JobTracker.Api.Middleware;
using JobTracker.Api.Services;
using JobTracker.Application.Abstractions;
using Microsoft.OpenApi;

namespace JobTracker.Api;

public static class RateLimitPolicies
{
    public const string Auth = "auth";
}

public static class DependencyInjection
{
    /// <summary>
    /// Registers what belongs to the HTTP layer: controllers, error handling, docs, rate limiting.
    /// </summary>
    public static IServiceCollection AddApi(this IServiceCollection services, IConfiguration configuration)
    {
        services
            .AddControllers(options => options.Filters.Add<ValidationFilter>())
            // Enums travel as text ("Remote") instead of numbers (2).
            .AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

        // Declare the Bearer scheme in the OpenAPI document so Scalar shows a field to paste the access token.
        services.AddOpenApi(options => options.AddDocumentTransformer((document, _, _) =>
        {
            document.Components ??= new OpenApiComponents();
            document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
            document.Components.SecuritySchemes["Bearer"] = new OpenApiSecurityScheme
            {
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT",
            };

            document.Security =
            [
                new OpenApiSecurityRequirement { [new OpenApiSecuritySchemeReference("Bearer", document)] = [] },
            ];

            return Task.CompletedTask;
        }));

        // Errors: every failure is answered as ProblemDetails.
        services.AddProblemDetails();
        services.AddExceptionHandler<GlobalExceptionHandler>();

        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUser, CurrentUser>();

        // Rate limiting slows down password guessing on the auth endpoints.
        int authPermitLimit = configuration.GetValue("RateLimiting:AuthPermitLimit", 10);
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.AddPolicy(RateLimitPolicies.Auth, httpContext => RateLimitPartition.GetFixedWindowLimiter(
                partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                factory: _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = authPermitLimit,
                    Window = TimeSpan.FromMinutes(1),
                }));
        });

        return services;
    }
}
