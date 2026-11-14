namespace JobTracker.Application.Common.Exceptions;

// Use cases throw these; the API's GlobalExceptionHandler maps each one to an HTTP status.
// The Application layer stays unaware of HTTP.

/// <summary>Maps to 401 Unauthorized.</summary>
public class UnauthorizedException : Exception
{
    public UnauthorizedException(string message)
        : base(message)
    {
    }
}

/// <summary>Maps to 404 Not Found.</summary>
public class NotFoundException : Exception
{
    public NotFoundException(string message)
        : base(message)
    {
    }
}

/// <summary>Maps to 409 Conflict.</summary>
public class ConflictException : Exception
{
    public ConflictException(string message)
        : base(message)
    {
    }
}

/// <summary>Maps to 400 Bad Request with per-field errors.</summary>
public class RequestValidationException : Exception
{
    public RequestValidationException(IDictionary<string, string[]> errors)
        : base("One or more validation errors occurred.")
    {
        Errors = errors;
    }

    public IDictionary<string, string[]> Errors { get; }
}
