using System.Net;
using System.Net.Http.Json;
using JobTracker.Application.Applications;
using JobTracker.Application.Dashboard;
using JobTracker.Domain.Enums;
using JobTracker.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JobTracker.IntegrationTests.Dashboard;

[Collection(ApiCollection.Name)]
public class DashboardEndpointsTests
{
    private const string SummaryUrl = "/api/dashboard/summary";
    private const string ApplicationsUrl = "/api/applications";

    private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.UtcNow);

    private readonly ApiFactory _factory;

    public DashboardEndpointsTests(ApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Summary_requires_authentication()
    {
        HttpResponseMessage response = await _factory.CreateClient().GetAsync(SummaryUrl);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Summary_for_a_new_user_is_all_zeros_with_complete_axes()
    {
        HttpClient client = await _factory.CreateAuthenticatedClientAsync();

        DashboardSummaryResponse summary = await GetSummaryAsync(client);

        Assert.Equal(0, summary.Total);
        Assert.Equal(0, summary.ResponseRate);
        Assert.Equal(0, summary.NeedsFollowUpCount);
        Assert.Equal(Enum.GetValues<ApplicationStatus>(), summary.ByStatus.Select(entry => entry.Status));
        Assert.All(summary.ByStatus, entry => Assert.Equal(0, entry.Count));
        Assert.Equal(12, summary.PerWeek.Count);
        Assert.All(summary.PerWeek, week => Assert.Equal(0, week.Count));
    }

    [Fact]
    public async Task Summary_counts_total_and_response_rate_from_the_history()
    {
        HttpClient client = await _factory.CreateAuthenticatedClientAsync();
        await CreateAsync(client);                                                   // still Applied: no response
        Guid ghosted = await CreateAsync(client);                                    // Applied -> NoResponse: no response
        Guid interviewing = await CreateAsync(client);                               // got an interview: response
        Guid interviewedThenGhosted = await CreateAsync(client);                     // interview, then silence: still a response
        await ChangeStatusAsync(client, ghosted, ApplicationStatus.NoResponse);
        await ChangeStatusAsync(client, interviewing, ApplicationStatus.HrInterview);
        await ChangeStatusAsync(client, interviewedThenGhosted, ApplicationStatus.HrInterview);
        await ChangeStatusAsync(client, interviewedThenGhosted, ApplicationStatus.NoResponse);

        DashboardSummaryResponse summary = await GetSummaryAsync(client);

        Assert.Equal(4, summary.Total);
        Assert.Equal(0.5, summary.ResponseRate);
    }

    [Fact]
    public async Task Summary_counts_applications_by_current_status()
    {
        HttpClient client = await _factory.CreateAuthenticatedClientAsync();
        await CreateAsync(client);
        await CreateAsync(client);
        Guid interviewing = await CreateAsync(client);
        Guid rejected = await CreateAsync(client);
        await ChangeStatusAsync(client, interviewing, ApplicationStatus.HrInterview);
        await ChangeStatusAsync(client, rejected, ApplicationStatus.HrInterview);
        await ChangeStatusAsync(client, rejected, ApplicationStatus.Rejected);

        DashboardSummaryResponse summary = await GetSummaryAsync(client);

        Dictionary<ApplicationStatus, int> counts = summary.ByStatus.ToDictionary(entry => entry.Status, entry => entry.Count);
        Assert.Equal(2, counts[ApplicationStatus.Applied]);
        Assert.Equal(1, counts[ApplicationStatus.HrInterview]);
        Assert.Equal(1, counts[ApplicationStatus.Rejected]);
        Assert.Equal(0, counts[ApplicationStatus.Offer]);
        Assert.Equal(summary.Total, counts.Values.Sum());
    }

    [Fact]
    public async Task Summary_groups_applications_per_week_for_the_last_12_weeks()
    {
        HttpClient client = await _factory.CreateAuthenticatedClientAsync();
        await CreateAsync(client, appliedOn: Today);
        await CreateAsync(client, appliedOn: Today);
        await CreateAsync(client, appliedOn: Today.AddDays(-7));   // always the previous week
        await CreateAsync(client, appliedOn: Today.AddDays(-100)); // older than the chart window

        DashboardSummaryResponse summary = await GetSummaryAsync(client);

        Assert.Equal(12, summary.PerWeek.Count);
        Assert.Equal(WeeklyBuckets.WeekStart(Today), summary.PerWeek[^1].WeekStart);
        Assert.Equal(2, summary.PerWeek[^1].Count);
        Assert.Equal(1, summary.PerWeek[^2].Count);
        Assert.Equal(3, summary.PerWeek.Sum(week => week.Count));
        Assert.Equal(4, summary.Total);
    }

    [Fact]
    public async Task Summary_counts_open_applications_that_need_follow_up()
    {
        HttpClient client = await _factory.CreateAuthenticatedClientAsync();
        Guid stale = await CreateAsync(client);
        Guid staleButClosed = await CreateAsync(client);
        await CreateAsync(client);
        await ChangeStatusAsync(client, staleButClosed, ApplicationStatus.Rejected);
        await SetLastActivityAsync(DateTimeOffset.UtcNow.AddDays(-10), stale, staleButClosed);

        DashboardSummaryResponse summary = await GetSummaryAsync(client);

        Assert.Equal(1, summary.NeedsFollowUpCount);
    }

    [Fact]
    public async Task Summary_only_counts_the_current_users_applications()
    {
        HttpClient first = await _factory.CreateAuthenticatedClientAsync();
        HttpClient second = await _factory.CreateAuthenticatedClientAsync();
        await CreateAsync(first);
        await CreateAsync(second);
        await CreateAsync(second);

        DashboardSummaryResponse summary = await GetSummaryAsync(first);

        Assert.Equal(1, summary.Total);
        Assert.Equal(1, summary.PerWeek.Sum(week => week.Count));
    }

    private static async Task<DashboardSummaryResponse> GetSummaryAsync(HttpClient client)
    {
        HttpResponseMessage response = await client.GetAsync(SummaryUrl);
        response.EnsureSuccessStatusCode();
        return await response.ReadAsync<DashboardSummaryResponse>();
    }

    private static async Task<Guid> CreateAsync(HttpClient client, DateOnly? appliedOn = null)
    {
        SaveApplicationRequest request = new(
            "Acme", "Junior Developer", null, null, WorkMode.Remote, null, null, appliedOn ?? Today, ApplicationSource.LinkedIn, null);

        HttpResponseMessage response = await client.PostAsJsonAsync(ApplicationsUrl, request, TestHelpers.Json);
        response.EnsureSuccessStatusCode();
        return (await response.ReadAsync<ApplicationDetailResponse>()).Id;
    }

    private static async Task ChangeStatusAsync(HttpClient client, Guid id, ApplicationStatus status)
    {
        HttpResponseMessage response = await client.PostAsJsonAsync(
            $"{ApplicationsUrl}/{id}/status", new ChangeStatusRequest(status, null), TestHelpers.Json);
        response.EnsureSuccessStatusCode();
    }

    private async Task SetLastActivityAsync(DateTimeOffset lastActivityAt, params Guid[] ids)
    {
        await using AsyncServiceScope scope = _factory.Services.CreateAsyncScope();
        AppDbContext dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        await dbContext.JobApplications
            .Where(a => ids.Contains(a.Id))
            .ExecuteUpdateAsync(setters => setters.SetProperty(a => a.LastActivityAt, lastActivityAt));
    }
}
