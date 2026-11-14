using JobTracker.Domain.Entities;
using JobTracker.Domain.Enums;
using JobTracker.Domain.Exceptions;

namespace JobTracker.UnitTests.Domain;

public class JobApplicationTests
{
    private static readonly Guid UserId = Guid.NewGuid();
    private static readonly DateTimeOffset Now = new(2026, 11, 2, 9, 0, 0, TimeSpan.Zero);

    private static JobApplicationDetails Details(string company = "Acme", string position = "Junior Developer") =>
        new(company, position, "https://example.com/job", "Monterrey", WorkMode.Hybrid, 18000m, "mxn", new DateOnly(2026, 11, 1), ApplicationSource.LinkedIn, "  ");

    private static JobApplication NewApplication() => JobApplication.Create(UserId, Details(), Now);

    [Fact]
    public void Create_starts_as_applied_with_one_history_row()
    {
        JobApplication application = NewApplication();

        Assert.Equal(ApplicationStatus.Applied, application.Status);
        Assert.Equal(Now, application.LastActivityAt);

        StatusChange first = Assert.Single(application.StatusHistory);
        Assert.Null(first.FromStatus);
        Assert.Equal(ApplicationStatus.Applied, first.ToStatus);
    }

    [Fact]
    public void Create_normalizes_text_fields()
    {
        JobApplication application = JobApplication.Create(UserId, Details(company: "  Acme  "), Now);

        Assert.Equal("Acme", application.Company);
        Assert.Equal("MXN", application.SalaryCurrency);
        Assert.Null(application.Notes);
    }

    [Theory]
    [InlineData("", "Developer")]
    [InlineData("Acme", "   ")]
    public void Create_rejects_blank_company_or_position(string company, string position)
    {
        Assert.Throws<DomainException>(() => JobApplication.Create(UserId, Details(company, position), Now));
    }

    [Fact]
    public void ChangeStatus_updates_status_and_appends_history()
    {
        JobApplication application = NewApplication();
        DateTimeOffset later = Now.AddDays(3);

        application.ChangeStatus(ApplicationStatus.HrInterview, "Call with recruiter", later);

        Assert.Equal(ApplicationStatus.HrInterview, application.Status);
        Assert.Equal(later, application.LastActivityAt);
        Assert.Equal(2, application.StatusHistory.Count);

        StatusChange last = application.StatusHistory.Last();
        Assert.Equal(ApplicationStatus.Applied, last.FromStatus);
        Assert.Equal(ApplicationStatus.HrInterview, last.ToStatus);
        Assert.Equal("Call with recruiter", last.Note);
        Assert.Equal(later, last.ChangedAt);
    }

    [Fact]
    public void ChangeStatus_to_the_same_status_throws()
    {
        JobApplication application = NewApplication();

        Assert.Throws<DomainException>(() => application.ChangeStatus(ApplicationStatus.Applied, null, Now));
        Assert.Single(application.StatusHistory);
    }

    [Fact]
    public void ChangeStatus_to_accepted_requires_an_offer()
    {
        JobApplication application = NewApplication();

        Assert.Throws<DomainException>(() => application.ChangeStatus(ApplicationStatus.Accepted, null, Now));

        application.ChangeStatus(ApplicationStatus.Offer, null, Now.AddDays(1));
        application.ChangeStatus(ApplicationStatus.Accepted, null, Now.AddDays(2));

        Assert.Equal(ApplicationStatus.Accepted, application.Status);
    }

    [Fact]
    public void ChangeStatus_allows_skipping_stages()
    {
        JobApplication application = NewApplication();

        application.ChangeStatus(ApplicationStatus.TechnicalTest, null, Now.AddDays(1));

        Assert.Equal(ApplicationStatus.TechnicalTest, application.Status);
    }

    [Fact]
    public void UpdateDetails_does_not_count_as_activity()
    {
        JobApplication application = NewApplication();

        application.UpdateDetails(Details(company: "Globex"), Now.AddDays(5));

        Assert.Equal("Globex", application.Company);
        Assert.Equal(Now, application.LastActivityAt);
        Assert.Equal(Now.AddDays(5), application.UpdatedAt);
    }

    [Theory]
    [InlineData(6, false)]
    [InlineData(7, true)]
    [InlineData(30, true)]
    public void NeedsFollowUp_is_true_after_the_configured_days_without_activity(int daysElapsed, bool expected)
    {
        JobApplication application = NewApplication();

        Assert.Equal(expected, application.NeedsFollowUp(followUpDays: 7, Now.AddDays(daysElapsed)));
    }

    [Fact]
    public void NeedsFollowUp_is_false_for_terminal_statuses()
    {
        JobApplication application = NewApplication();
        application.ChangeStatus(ApplicationStatus.Rejected, null, Now);

        Assert.False(application.NeedsFollowUp(followUpDays: 7, Now.AddDays(60)));
    }
}
