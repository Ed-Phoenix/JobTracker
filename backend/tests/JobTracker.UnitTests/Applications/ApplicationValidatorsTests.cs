using FluentValidation.Results;
using JobTracker.Application.Applications;
using JobTracker.Domain.Enums;

namespace JobTracker.UnitTests.Applications;

public class ApplicationValidatorsTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 14, 12, 0, 0, TimeSpan.Zero);

    private readonly SaveApplicationRequestValidator _saveValidator = new(new FixedTimeProvider(Now));
    private readonly ApplicationListQueryValidator _queryValidator = new();

    private static SaveApplicationRequest ValidRequest() =>
        new("Acme", "Junior Developer", "https://example.com/job", "Monterrey", WorkMode.Hybrid, 18000, "MXN",
            new DateOnly(2026, 11, 10), ApplicationSource.LinkedIn, null);

    [Fact]
    public void Save_accepts_a_valid_request()
    {
        Assert.True(_saveValidator.Validate(ValidRequest()).IsValid);
    }

    [Fact]
    public void Save_accepts_optional_fields_left_empty()
    {
        SaveApplicationRequest request = ValidRequest() with { JobUrl = null, Location = null, SalaryAmount = null, SalaryCurrency = null, Notes = null };

        Assert.True(_saveValidator.Validate(request).IsValid);
    }

    [Theory]
    [InlineData("not-a-url")]
    [InlineData("ftp://example.com/job")]
    [InlineData("javascript:alert(1)")]
    public void Save_rejects_urls_that_are_not_http(string jobUrl)
    {
        ValidationResult result = _saveValidator.Validate(ValidRequest() with { JobUrl = jobUrl });

        Assert.Contains(result.Errors, error => error.PropertyName == nameof(SaveApplicationRequest.JobUrl));
    }

    [Theory]
    [InlineData("2026-11-15", true)]   // tomorrow in UTC: allowed for users in later time zones
    [InlineData("2026-11-16", false)]
    [InlineData("1999-12-31", false)]
    public void Save_validates_the_applied_date_range(string appliedOn, bool expected)
    {
        ValidationResult result = _saveValidator.Validate(ValidRequest() with { AppliedOn = DateOnly.Parse(appliedOn) });

        Assert.Equal(expected, result.IsValid);
    }

    [Fact]
    public void Save_requires_work_mode_source_and_applied_date()
    {
        ValidationResult result = _saveValidator.Validate(ValidRequest() with { WorkMode = null, Source = null, AppliedOn = null });

        Assert.Contains(result.Errors, error => error.PropertyName == nameof(SaveApplicationRequest.WorkMode));
        Assert.Contains(result.Errors, error => error.PropertyName == nameof(SaveApplicationRequest.Source));
        Assert.Contains(result.Errors, error => error.PropertyName == nameof(SaveApplicationRequest.AppliedOn));
    }

    [Fact]
    public void Save_rejects_enum_values_that_do_not_exist()
    {
        ValidationResult result = _saveValidator.Validate(ValidRequest() with { WorkMode = (WorkMode)99 });

        Assert.Contains(result.Errors, error => error.PropertyName == nameof(SaveApplicationRequest.WorkMode));
    }

    [Fact]
    public void Query_defaults_are_valid()
    {
        Assert.True(_queryValidator.Validate(new ApplicationListQuery()).IsValid);
    }

    [Theory]
    [InlineData("company", "ASC", true)]
    [InlineData("LastActivityAt", "desc", true)]
    [InlineData("userId", "asc", false)]
    [InlineData("company", "up", false)]
    public void Query_only_allows_known_sort_fields_and_directions(string sortBy, string sortDir, bool expected)
    {
        ValidationResult result = _queryValidator.Validate(new ApplicationListQuery { SortBy = sortBy, SortDir = sortDir });

        Assert.Equal(expected, result.IsValid);
    }

    /// <summary>A clock frozen at a known instant, so date rules can be tested deterministically.</summary>
    private sealed class FixedTimeProvider : TimeProvider
    {
        private readonly DateTimeOffset _now;

        public FixedTimeProvider(DateTimeOffset now)
        {
            _now = now;
        }

        public override DateTimeOffset GetUtcNow() => _now;
    }
}
