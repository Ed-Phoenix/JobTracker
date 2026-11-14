using JobTracker.Application.Abstractions;
using JobTracker.Application.Common.Exceptions;
using Microsoft.IdentityModel.JsonWebTokens;

namespace JobTracker.Api.Services;

/// <summary>
/// Reads the user id from the "sub" claim of the validated JWT.
/// </summary>
public class CurrentUser : ICurrentUser
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUser(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Guid UserId
    {
        get
        {
            string? subject = _httpContextAccessor.HttpContext?.User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

            return Guid.TryParse(subject, out Guid userId)
                ? userId
                : throw new UnauthorizedException("The request is not authenticated.");
        }
    }
}
