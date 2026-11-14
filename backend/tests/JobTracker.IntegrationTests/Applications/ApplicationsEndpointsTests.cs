using System.Net;
using System.Net.Http.Json;
using JobTracker.Application.Applications;
using JobTracker.Application.Common;
using JobTracker.Domain.Enums;
using JobTracker.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JobTracker.IntegrationTests.Applications;

[Collection(ApiCollection.Name)]
public class ApplicationsEndpointsTests
{
    private const string Url = "/api/applications";

    private readonly ApiFactory _factory;

    public ApplicationsEndpointsTests(ApiFactory factory)
    {
        _factory = factory;
    }

    // ---------- Create ----------

    [Fact]
    public async Task Create_returns_201_with_location_and_starts_as_applied()
    {
        HttpClient client = await _factory.CreateAuthenticatedClientAsync();

        HttpResponseMessage response = await client.PostAsJsonAsync(Url, NewRequest(company: "Acme"), TestHelpers.Json);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        ApplicationDetailResponse created = await response.ReadAsync<ApplicationDetailResponse>();
        Assert.Equal("Acme", created.Company);
        Assert.Equal(ApplicationStatus.Applied, created.Status);
        Assert.Equal("MXN", created.SalaryCurrency);
        Assert.Single(created.StatusHistory);

        // The Location header must point to a URL that actually returns the new resource.
        Assert.NotNull(response.Headers.Location);
        HttpResponseMessage get = await client.GetAsync(response.Headers.Location);
        Assert.Equal(HttpStatusCode.OK, get.StatusCode);
    }

    [Fact]
    public async Task Create_with_invalid_data_returns_400_with_errors_per_field()
    {
        HttpClient client = await _factory.CreateAuthenticatedClientAsync();
        SaveApplicationRequest invalid = new("", "Dev", "not-a-url", null, null, -5, "PESOS", null, null, null);

        HttpResponseMessage response = await client.PostAsJsonAsync(Url, invalid, TestHelpers.Json);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        ValidationProblemDetails problem = await response.ReadAsync<ValidationProblemDetails>();
        Assert.Superset(
            new HashSet<string> { "company", "jobUrl", "workMode", "salaryAmount", "salaryCurrency", "appliedOn", "source" },
            problem.Errors.Keys.ToHashSet());
    }

    [Fact]
    public async Task Endpoints_require_authentication()
    {
        HttpClient anonymous = _factory.CreateClient();

        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync(Url)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.PostAsJsonAsync(Url, NewRequest(), TestHelpers.Json)).StatusCode);
    }

    // ---------- Isolation between users ----------

    [Fact]
    public async Task A_user_cannot_read_update_or_change_another_users_application()
    {
        HttpClient owner = await _factory.CreateAuthenticatedClientAsync();
        HttpClient stranger = await _factory.CreateAuthenticatedClientAsync();
        ApplicationDetailResponse application = await CreateAsync(owner);

        HttpResponseMessage get = await stranger.GetAsync($"{Url}/{application.Id}");
        HttpResponseMessage put = await stranger.PutAsJsonAsync($"{Url}/{application.Id}", NewRequest(company: "Hacked"), TestHelpers.Json);
        HttpResponseMessage status = await stranger.PostAsJsonAsync(
            $"{Url}/{application.Id}/status", new ChangeStatusRequest(ApplicationStatus.Rejected, null), TestHelpers.Json);

        // 404, not 403: the stranger must not learn that the id exists.
        Assert.Equal(HttpStatusCode.NotFound, get.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, put.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, status.StatusCode);

        ApplicationDetailResponse unchanged = await (await owner.GetAsync($"{Url}/{application.Id}")).ReadAsync<ApplicationDetailResponse>();
        Assert.Equal(application.Company, unchanged.Company);
        Assert.Equal(ApplicationStatus.Applied, unchanged.Status);
    }

    [Fact]
    public async Task List_only_returns_the_current_users_applications()
    {
        HttpClient first = await _factory.CreateAuthenticatedClientAsync();
        HttpClient second = await _factory.CreateAuthenticatedClientAsync();
        await CreateAsync(first, company: "Mine");
        await CreateAsync(second, company: "Theirs");

        PagedResult<ApplicationSummaryResponse> page = await ListAsync(first);

        ApplicationSummaryResponse only = Assert.Single(page.Items);
        Assert.Equal("Mine", only.Company);
        Assert.Equal(1, page.TotalCount);
    }

    // ---------- Read / update ----------

    [Fact]
    public async Task Get_unknown_id_returns_404_problem_details()
    {
        HttpClient client = await _factory.CreateAuthenticatedClientAsync();

        HttpResponseMessage response = await client.GetAsync($"{Url}/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task Update_changes_details_but_not_status_or_history()
    {
        HttpClient client = await _factory.CreateAuthenticatedClientAsync();
        ApplicationDetailResponse application = await CreateAsync(client);

        SaveApplicationRequest changes = NewRequest(company: "Globex", position: "Backend Developer") with
        {
            WorkMode = WorkMode.Remote,
            SalaryAmount = 25000,
            SalaryCurrency = "usd",
        };
        HttpResponseMessage response = await client.PutAsJsonAsync($"{Url}/{application.Id}", changes, TestHelpers.Json);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        ApplicationDetailResponse updated = await response.ReadAsync<ApplicationDetailResponse>();
        Assert.Equal("Globex", updated.Company);
        Assert.Equal("Backend Developer", updated.Position);
        Assert.Equal(WorkMode.Remote, updated.WorkMode);
        Assert.Equal(25000, updated.SalaryAmount);
        Assert.Equal("USD", updated.SalaryCurrency);
        Assert.Equal(ApplicationStatus.Applied, updated.Status);
        Assert.Single(updated.StatusHistory);
    }

    // ---------- Status changes ----------

    [Fact]
    public async Task Change_status_appends_history_newest_first_and_persists()
    {
        HttpClient client = await _factory.CreateAuthenticatedClientAsync();
        ApplicationDetailResponse application = await CreateAsync(client);

        await ChangeStatusAsync(client, application.Id, ApplicationStatus.HrInterview, "Call with recruiter");
        HttpResponseMessage response = await ChangeStatusAsync(client, application.Id, ApplicationStatus.TechnicalTest);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        // Read it again from the database rather than trusting the response of the change itself.
        ApplicationDetailResponse reloaded = await (await client.GetAsync($"{Url}/{application.Id}")).ReadAsync<ApplicationDetailResponse>();
        Assert.Equal(ApplicationStatus.TechnicalTest, reloaded.Status);
        Assert.Equal(
            [ApplicationStatus.TechnicalTest, ApplicationStatus.HrInterview, ApplicationStatus.Applied],
            reloaded.StatusHistory.Select(change => change.ToStatus));
        Assert.Equal("Call with recruiter", reloaded.StatusHistory[1].Note);
        Assert.Equal(ApplicationStatus.HrInterview, reloaded.StatusHistory[0].FromStatus);
    }

    [Fact]
    public async Task Change_status_that_breaks_a_domain_rule_returns_409()
    {
        HttpClient client = await _factory.CreateAuthenticatedClientAsync();
        ApplicationDetailResponse application = await CreateAsync(client);

        HttpResponseMessage sameStatus = await ChangeStatusAsync(client, application.Id, ApplicationStatus.Applied);
        HttpResponseMessage acceptedWithoutOffer = await ChangeStatusAsync(client, application.Id, ApplicationStatus.Accepted);

        Assert.Equal(HttpStatusCode.Conflict, sameStatus.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, acceptedWithoutOffer.StatusCode);

        ProblemDetails problem = await acceptedWithoutOffer.ReadAsync<ProblemDetails>();
        Assert.Contains("offer", problem.Detail);
    }

    [Fact]
    public async Task Change_status_without_a_status_returns_400()
    {
        HttpClient client = await _factory.CreateAuthenticatedClientAsync();
        ApplicationDetailResponse application = await CreateAsync(client);

        HttpResponseMessage response = await client.PostAsJsonAsync(
            $"{Url}/{application.Id}/status", new ChangeStatusRequest(null, "note"), TestHelpers.Json);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // ---------- Delete ----------

    [Fact]
    public async Task Delete_returns_204_and_removes_the_application_with_its_history()
    {
        HttpClient client = await _factory.CreateAuthenticatedClientAsync();
        ApplicationDetailResponse application = await CreateAsync(client);
        await ChangeStatusAsync(client, application.Id, ApplicationStatus.HrInterview);

        HttpResponseMessage delete = await client.DeleteAsync($"{Url}/{application.Id}");

        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"{Url}/{application.Id}")).StatusCode);
        Assert.Equal(0, await CountHistoryRowsAsync(application.Id));
    }

    [Fact]
    public async Task Delete_another_users_application_returns_404_and_keeps_it()
    {
        HttpClient owner = await _factory.CreateAuthenticatedClientAsync();
        HttpClient stranger = await _factory.CreateAuthenticatedClientAsync();
        ApplicationDetailResponse application = await CreateAsync(owner);

        HttpResponseMessage delete = await stranger.DeleteAsync($"{Url}/{application.Id}");

        Assert.Equal(HttpStatusCode.NotFound, delete.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await owner.GetAsync($"{Url}/{application.Id}")).StatusCode);
    }

    [Fact]
    public async Task Delete_unknown_or_already_deleted_id_returns_404()
    {
        HttpClient client = await _factory.CreateAuthenticatedClientAsync();
        ApplicationDetailResponse application = await CreateAsync(client);
        await client.DeleteAsync($"{Url}/{application.Id}");

        HttpResponseMessage deleteAgain = await client.DeleteAsync($"{Url}/{application.Id}");
        HttpResponseMessage deleteUnknown = await client.DeleteAsync($"{Url}/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, deleteAgain.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, deleteUnknown.StatusCode);
    }

    // ---------- List: search, filters, sorting, paging ----------

    [Fact]
    public async Task List_search_matches_company_or_position_ignoring_case()
    {
        HttpClient client = await _factory.CreateAuthenticatedClientAsync();
        await CreateAsync(client, company: "Northwind", position: "QA Engineer");
        await CreateAsync(client, company: "Contoso", position: "Backend Developer");
        await CreateAsync(client, company: "Fabrikam", position: "Designer");

        PagedResult<ApplicationSummaryResponse> byCompany = await ListAsync(client, "search=NORTH");
        PagedResult<ApplicationSummaryResponse> byPosition = await ListAsync(client, "search=developer");

        Assert.Equal("Northwind", Assert.Single(byCompany.Items).Company);
        Assert.Equal("Contoso", Assert.Single(byPosition.Items).Company);
    }

    [Fact]
    public async Task List_search_treats_like_wildcards_as_plain_text()
    {
        HttpClient client = await _factory.CreateAuthenticatedClientAsync();
        await CreateAsync(client, company: "Acme");

        PagedResult<ApplicationSummaryResponse> page = await ListAsync(client, "search=%25");

        Assert.Empty(page.Items);
    }

    [Fact]
    public async Task List_filters_by_status_and_source()
    {
        HttpClient client = await _factory.CreateAuthenticatedClientAsync();
        ApplicationDetailResponse interviewing = await CreateAsync(client, company: "A", source: ApplicationSource.LinkedIn);
        await CreateAsync(client, company: "B", source: ApplicationSource.Occ);
        await CreateAsync(client, company: "C", source: ApplicationSource.LinkedIn);
        await ChangeStatusAsync(client, interviewing.Id, ApplicationStatus.HrInterview);

        PagedResult<ApplicationSummaryResponse> byStatus = await ListAsync(client, "status=HrInterview");
        PagedResult<ApplicationSummaryResponse> bySource = await ListAsync(client, "source=LinkedIn");
        PagedResult<ApplicationSummaryResponse> both = await ListAsync(client, "status=Applied&source=LinkedIn");

        Assert.Equal("A", Assert.Single(byStatus.Items).Company);
        Assert.Equal(2, bySource.TotalCount);
        Assert.Equal("C", Assert.Single(both.Items).Company);
    }

    [Fact]
    public async Task List_sorts_by_the_requested_field_and_direction()
    {
        HttpClient client = await _factory.CreateAuthenticatedClientAsync();
        await CreateAsync(client, company: "Bravo", appliedOn: new DateOnly(2026, 10, 3));
        await CreateAsync(client, company: "Alpha", appliedOn: new DateOnly(2026, 10, 1));
        await CreateAsync(client, company: "Charlie", appliedOn: new DateOnly(2026, 10, 2));

        PagedResult<ApplicationSummaryResponse> byDefault = await ListAsync(client);
        PagedResult<ApplicationSummaryResponse> byCompany = await ListAsync(client, "sortBy=company&sortDir=asc");

        // Default: most recent application first.
        Assert.Equal(["Bravo", "Charlie", "Alpha"], byDefault.Items.Select(a => a.Company));
        Assert.Equal(["Alpha", "Bravo", "Charlie"], byCompany.Items.Select(a => a.Company));
    }

    [Fact]
    public async Task List_paginates_and_reports_totals()
    {
        HttpClient client = await _factory.CreateAuthenticatedClientAsync();
        for (int i = 1; i <= 5; i++)
        {
            await CreateAsync(client, company: $"Company {i}");
        }

        PagedResult<ApplicationSummaryResponse> first = await ListAsync(client, "sortBy=company&sortDir=asc&page=1&pageSize=2");
        PagedResult<ApplicationSummaryResponse> last = await ListAsync(client, "sortBy=company&sortDir=asc&page=3&pageSize=2");

        Assert.Equal(["Company 1", "Company 2"], first.Items.Select(a => a.Company));
        Assert.Equal(5, first.TotalCount);
        Assert.Equal(3, first.TotalPages);
        Assert.Equal("Company 5", Assert.Single(last.Items).Company);
    }

    [Theory]
    [InlineData("page=0", "page")]
    [InlineData("pageSize=101", "pageSize")]
    [InlineData("sortBy=passwordHash", "sortBy")]
    [InlineData("sortDir=sideways", "sortDir")]
    [InlineData("status=NotAStatus", "Status")] // Rejected earlier, by model binding, which names it after the C# property.
    public async Task List_with_invalid_query_returns_400_naming_the_parameter(string queryString, string expectedKey)
    {
        HttpClient client = await _factory.CreateAuthenticatedClientAsync();

        HttpResponseMessage response = await client.GetAsync($"{Url}?{queryString}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        ValidationProblemDetails problem = await response.ReadAsync<ValidationProblemDetails>();
        Assert.Contains(expectedKey, problem.Errors.Keys);
    }

    [Fact]
    public async Task List_needs_follow_up_returns_open_applications_without_recent_activity()
    {
        HttpClient client = await _factory.CreateAuthenticatedClientAsync();
        ApplicationDetailResponse stale = await CreateAsync(client, company: "Stale");
        ApplicationDetailResponse staleButClosed = await CreateAsync(client, company: "Closed");
        await CreateAsync(client, company: "Fresh");
        await ChangeStatusAsync(client, staleButClosed.Id, ApplicationStatus.Rejected);

        // Time cannot be advanced through the API, so the test ages the rows directly in the database.
        await SetLastActivityAsync(DateTimeOffset.UtcNow.AddDays(-10), stale.Id, staleButClosed.Id);

        PagedResult<ApplicationSummaryResponse> needsFollowUp = await ListAsync(client, "needsFollowUp=true");
        PagedResult<ApplicationSummaryResponse> upToDate = await ListAsync(client, "needsFollowUp=false&sortBy=company&sortDir=asc");

        ApplicationSummaryResponse flagged = Assert.Single(needsFollowUp.Items);
        Assert.Equal("Stale", flagged.Company);
        Assert.True(flagged.NeedsFollowUp);

        Assert.Equal(["Closed", "Fresh"], upToDate.Items.Select(a => a.Company));
        Assert.All(upToDate.Items, a => Assert.False(a.NeedsFollowUp));
    }

    // ---------- Helpers ----------

    private static SaveApplicationRequest NewRequest(
        string company = "Acme",
        string position = "Junior Developer",
        ApplicationSource source = ApplicationSource.LinkedIn,
        DateOnly? appliedOn = null) =>
        new(company, position, "https://example.com/jobs/1", "Monterrey", WorkMode.Hybrid, 18000, null,
            appliedOn ?? new DateOnly(2026, 10, 15), source, "Some notes");

    private static async Task<ApplicationDetailResponse> CreateAsync(
        HttpClient client,
        string company = "Acme",
        string position = "Junior Developer",
        ApplicationSource source = ApplicationSource.LinkedIn,
        DateOnly? appliedOn = null)
    {
        HttpResponseMessage response = await client.PostAsJsonAsync(Url, NewRequest(company, position, source, appliedOn), TestHelpers.Json);
        response.EnsureSuccessStatusCode();
        return await response.ReadAsync<ApplicationDetailResponse>();
    }

    private static Task<HttpResponseMessage> ChangeStatusAsync(HttpClient client, Guid id, ApplicationStatus status, string? note = null) =>
        client.PostAsJsonAsync($"{Url}/{id}/status", new ChangeStatusRequest(status, note), TestHelpers.Json);

    private static async Task<PagedResult<ApplicationSummaryResponse>> ListAsync(HttpClient client, string queryString = "")
    {
        HttpResponseMessage response = await client.GetAsync($"{Url}?{queryString}");
        response.EnsureSuccessStatusCode();
        return await response.ReadAsync<PagedResult<ApplicationSummaryResponse>>();
    }

    private async Task<int> CountHistoryRowsAsync(Guid applicationId)
    {
        await using AsyncServiceScope scope = _factory.Services.CreateAsyncScope();
        AppDbContext dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        return await dbContext.StatusChanges.CountAsync(change => change.JobApplicationId == applicationId);
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
