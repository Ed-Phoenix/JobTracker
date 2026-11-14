using JobTracker.Application.Abstractions;
using JobTracker.Application.Common.Exceptions;
using JobTracker.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace JobTracker.Infrastructure.Identity;

public class UserPreferences : IUserPreferences
{
    private readonly AppDbContext _dbContext;

    public UserPreferences(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<int> GetFollowUpDaysAsync(Guid userId, CancellationToken cancellationToken)
    {
        // Projection: SELECT only the one column we need instead of the whole user row.
        int? followUpDays = await _dbContext.Users
            .Where(user => user.Id == userId)
            .Select(user => (int?)user.FollowUpDays)
            .SingleOrDefaultAsync(cancellationToken);

        return followUpDays ?? throw new UnauthorizedException("The user no longer exists.");
    }
}
