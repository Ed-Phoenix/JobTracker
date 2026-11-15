using System.Net;

namespace JobTracker.IntegrationTests;

[Collection(ApiCollection.Name)]
public class HealthEndpointTests
{
    private readonly HttpClient _client;

    public HealthEndpointTests(ApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Get_health_returns_200_and_healthy_when_the_database_is_reachable()
    {
        HttpResponseMessage response = await _client.GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Healthy", await response.Content.ReadAsStringAsync());
    }

    [Theory]
    [InlineData("/api/health")]
    [InlineData("/api/auth/me")]       // 401 responses too
    [InlineData("/api/applications/x")] // and 404s
    public async Task Api_responses_must_never_be_cached(string url)
    {
        HttpResponseMessage response = await _client.GetAsync(url);

        Assert.True(response.Headers.CacheControl?.NoStore, $"{url} should send Cache-Control: no-store");
    }
}
