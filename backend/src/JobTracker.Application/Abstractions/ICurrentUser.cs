namespace JobTracker.Application.Abstractions;

/// <summary>
/// The authenticated user of the current request.
/// Use cases take the user id from here, never from the request body,
/// so a user can only ever act on their own data.
/// </summary>
public interface ICurrentUser
{
    Guid UserId { get; }
}
