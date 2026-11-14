using JobTracker.Api;
using JobTracker.Application;
using JobTracker.Infrastructure;
using JobTracker.Infrastructure.Persistence;
using Scalar.AspNetCore;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Logging: Serilog replaces the default logger and is configured from appsettings / env vars.
builder.Host.UseSerilog((context, services, loggerConfiguration) => loggerConfiguration
    .ReadFrom.Configuration(context.Configuration)
    .ReadFrom.Services(services)
    .Enrich.FromLogContext());

// Services (dependency injection container): each layer registers its own.
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddApi(builder.Configuration);

var app = builder.Build();

// Apply migrations / seed demo data when enabled by configuration.
await app.Services.InitializeDatabaseAsync();

// HTTP request pipeline: the order of the middleware matters.
app.UseSerilogRequestLogging(); // Outermost, so it logs the final status code of every request.
app.UseExceptionHandler();      // Catches exceptions thrown by everything below.
app.UseStatusCodePages();       // Gives empty error responses (401, 404...) a ProblemDetails body.

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();             // OpenAPI document at /openapi/v1.json
    app.MapScalarApiReference();  // Interactive API docs at /scalar
}

app.UseAuthentication();     // Who are you? (validates the JWT and fills HttpContext.User)
app.UseAuthorization();      // Are you allowed? (enforces [Authorize])
app.UseRateLimiter();

app.MapControllers();
app.MapHealthChecks("/api/health");

app.Run();
