using JobTracker.Application.Common.Exceptions;
using JobTracker.Domain.Exceptions;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace JobTracker.Api.Middleware;

/// <summary>
/// One place that turns exceptions into HTTP responses in the ProblemDetails format (RFC 9457).
/// Controllers stay free of try/catch blocks.
/// </summary>
public class GlobalExceptionHandler : IExceptionHandler
{
    private readonly IProblemDetailsService _problemDetailsService;
    private readonly ILogger<GlobalExceptionHandler> _logger;

    public GlobalExceptionHandler(IProblemDetailsService problemDetailsService, ILogger<GlobalExceptionHandler> logger)
    {
        _problemDetailsService = problemDetailsService;
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        int status = exception switch
        {
            RequestValidationException => StatusCodes.Status400BadRequest,
            UnauthorizedException => StatusCodes.Status401Unauthorized,
            NotFoundException => StatusCodes.Status404NotFound,
            ConflictException or DomainException => StatusCodes.Status409Conflict,
            _ => StatusCodes.Status500InternalServerError,
        };

        if (status == StatusCodes.Status500InternalServerError)
        {
            _logger.LogError(exception, "Unhandled exception");
        }

        httpContext.Response.StatusCode = status;

        if (exception is RequestValidationException validation)
        {
            ValidationProblemDetails validationProblem = new(validation.Errors) { Status = status };
            await httpContext.Response.WriteAsJsonAsync(
                validationProblem, options: null, contentType: "application/problem+json", cancellationToken);
            return true;
        }

        ProblemDetails problem = new()
        {
            Status = status,
            // Expected errors carry a message written for the client; unexpected ones never leak internals.
            Detail = status == StatusCodes.Status500InternalServerError ? "An unexpected error occurred." : exception.Message,
        };

        return await _problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            ProblemDetails = problem,
            Exception = exception,
        });
    }
}
