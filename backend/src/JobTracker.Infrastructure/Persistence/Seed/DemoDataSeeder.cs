using JobTracker.Domain.Entities;
using JobTracker.Domain.Enums;
using JobTracker.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace JobTracker.Infrastructure.Persistence.Seed;

/// <summary>
/// Creates a demo user with realistic-looking applications so the app is not empty in a demo.
/// It is idempotent: if the demo user already exists it does nothing.
/// </summary>
public class DemoDataSeeder
{
    private const int ApplicationCount = 25;

    private static readonly string[] Companies =
    [
        "Brightloop", "Nubelia", "Codevanta", "Altiplano Tech", "Kairo Systems", "Lumenbyte", "Tresmares Digital",
        "Orbitra", "Pixelnorte", "Quanta Forge", "Sierra Data", "Verdant Apps", "Zafiro Labs", "Hexaflow",
    ];

    private static readonly string[] Positions =
    [
        "Junior Backend Developer", "Junior .NET Developer", "Junior Full-Stack Developer", "Software Engineer I",
        "Junior Frontend Developer", "Trainee Developer", "Junior Python Developer", "Junior QA Automation Engineer",
    ];

    private static readonly string[] Locations = ["Monterrey", "Guadalajara", "Ciudad de México", "Querétaro", "Mérida"];

    // Typical paths an application follows after "Applied".
    private static readonly ApplicationStatus[][] Paths =
    [
        [],
        [],
        [ApplicationStatus.NoResponse],
        [ApplicationStatus.Rejected],
        [ApplicationStatus.HrInterview],
        [ApplicationStatus.HrInterview, ApplicationStatus.Rejected],
        [ApplicationStatus.HrInterview, ApplicationStatus.TechnicalInterview],
        [ApplicationStatus.HrInterview, ApplicationStatus.TechnicalTest, ApplicationStatus.Rejected],
        [ApplicationStatus.HrInterview, ApplicationStatus.TechnicalTest, ApplicationStatus.TechnicalInterview, ApplicationStatus.Offer],
        [ApplicationStatus.HrInterview, ApplicationStatus.TechnicalInterview, ApplicationStatus.Offer, ApplicationStatus.Accepted],
    ];

    private readonly AppDbContext _dbContext;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly TimeProvider _timeProvider;
    private readonly SeedOptions _options;
    private readonly ILogger<DemoDataSeeder> _logger;

    public DemoDataSeeder(
        AppDbContext dbContext,
        UserManager<ApplicationUser> userManager,
        TimeProvider timeProvider,
        IOptions<SeedOptions> options,
        ILogger<DemoDataSeeder> logger)
    {
        _dbContext = dbContext;
        _userManager = userManager;
        _timeProvider = timeProvider;
        _options = options.Value;
        _logger = logger;
    }

    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.DemoPassword))
        {
            throw new InvalidOperationException("Seed:DemoPassword must be configured when Seed:Enabled is true.");
        }

        if (await _userManager.FindByEmailAsync(_options.DemoEmail) is not null)
        {
            _logger.LogInformation("Demo user already exists, skipping seed");
            return;
        }

        ApplicationUser user = new()
        {
            Id = Guid.CreateVersion7(),
            UserName = _options.DemoEmail,
            Email = _options.DemoEmail,
            EmailConfirmed = true,
            FullName = "Demo User",
        };

        // UserManager hashes the password and applies the Identity validation rules.
        IdentityResult result = await _userManager.CreateAsync(user, _options.DemoPassword);
        if (!result.Succeeded)
        {
            string errors = string.Join("; ", result.Errors.Select(e => e.Description));
            throw new InvalidOperationException($"Could not create the demo user: {errors}");
        }

        _dbContext.JobApplications.AddRange(BuildApplications(user.Id, _timeProvider.GetUtcNow()));
        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Seeded demo user {Email} with {Count} applications", _options.DemoEmail, ApplicationCount);
    }

    private static List<JobApplication> BuildApplications(Guid userId, DateTimeOffset now)
    {
        // Fixed seed: the demo data is the same on every machine.
        Random random = new(42);
        List<JobApplication> applications = [];

        for (int i = 0; i < ApplicationCount; i++)
        {
            // Spread over the last ~12 weeks so the "per week" chart has data.
            DateTimeOffset appliedAt = now.AddDays(-random.Next(1, 84)).AddHours(-random.Next(0, 8));

            JobApplicationDetails details = new(
                Company: Companies[random.Next(Companies.Length)],
                Position: Positions[random.Next(Positions.Length)],
                JobUrl: $"https://example.com/jobs/{1000 + i}",
                Location: Locations[random.Next(Locations.Length)],
                WorkMode: (WorkMode)random.Next(Enum.GetValues<WorkMode>().Length),
                SalaryAmount: random.Next(4) == 0 ? null : random.Next(14, 31) * 1000m,
                SalaryCurrency: "MXN",
                AppliedOn: DateOnly.FromDateTime(appliedAt.UtcDateTime),
                Source: (ApplicationSource)random.Next(Enum.GetValues<ApplicationSource>().Length),
                Notes: random.Next(3) == 0 ? "Found through a friend's recommendation. Review the company's tech blog before the interview." : null);

            JobApplication application = JobApplication.Create(userId, details, appliedAt);

            // Replay the path through the same domain method the API will use,
            // so seeded history follows the real business rules.
            DateTimeOffset changedAt = appliedAt;
            foreach (ApplicationStatus status in Paths[random.Next(Paths.Length)])
            {
                changedAt = changedAt.AddDays(random.Next(2, 9));
                if (changedAt > now)
                {
                    break;
                }

                application.ChangeStatus(status, note: null, changedAt);
            }

            applications.Add(application);
        }

        return applications;
    }
}
