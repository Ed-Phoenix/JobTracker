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

// Services (dependency injection container).
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddHealthChecks();

var app = builder.Build();

// Apply migrations / seed demo data when enabled by configuration.
await app.Services.InitializeDatabaseAsync();

// HTTP request pipeline: the order of the middleware matters.
app.UseSerilogRequestLogging();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();             // OpenAPI document at /openapi/v1.json
    app.MapScalarApiReference();  // Interactive API docs at /scalar
}

app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/api/health");

app.Run();
