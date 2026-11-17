using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using JobTracker.Api.Filters;
using JobTracker.Api.Middleware;
using JobTracker.Api.Services;
using JobTracker.Application.Abstractions;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.AspNetCore.Mvc.ModelBinding;
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
            .AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()))
            .ConfigureApiBehaviorOptions(options =>
            {
                // Values that cannot even be converted (?format=pdf for an enum) are rejected by model
                // binding, before ValidationFilter runs. Rebuild those errors with camelCase keys too,
                // so every 400 from the API has the same shape.
                options.InvalidModelStateResponseFactory = context =>
                {
                    ModelStateDictionary errors = new();
                    foreach ((string key, ModelStateEntry entry) in context.ModelState)
                    {
                        foreach (ModelError error in entry.Errors)
                        {
                            errors.AddModelError(JsonNamingPolicy.CamelCase.ConvertName(key), error.ErrorMessage);
                        }
                    }

                    ValidationProblemDetails problem = context.HttpContext.RequestServices
                        .GetRequiredService<ProblemDetailsFactory>()
                        .CreateValidationProblemDetails(context.HttpContext, errors);

                    return new BadRequestObjectResult(problem) { ContentTypes = { "application/problem+json" } };
                };
            });

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

        // Trust X-Forwarded-For / X-Forwarded-Proto from the proxy in front of the API.
        // The lists of known proxies are cleared because the proxy's address is not fixed
        // (Docker network, hosting platform). That is only safe because the API is never
        // reachable directly: in docker-compose it publishes no port, only Nginx does.
        services.Configure<ForwardedHeadersOptions>(options =>
        {
            options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
            options.KnownIPNetworks.Clear();
            options.KnownProxies.Clear();
        });

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
