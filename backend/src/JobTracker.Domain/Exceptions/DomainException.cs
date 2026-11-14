namespace JobTracker.Domain.Exceptions;

/// <summary>
/// Thrown when an operation would break a business rule.
/// The API layer will translate it into an HTTP 409 Conflict response.
/// </summary>
public class DomainException : Exception
{
    public DomainException(string message)
        : base(message)
    {
    }
}
