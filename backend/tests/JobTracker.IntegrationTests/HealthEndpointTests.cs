using System.Net;

namespace JobTracker.IntegrationTests;

/// <summary>
/// ApiFactory (a WebApplicationFactory) boots the real API in memory (same Program.cs, same pipeline)
/// and gives us an HttpClient to call it, without opening a network port.
/// </summary>
public class HealthEndpointTests : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client;

    public HealthEndpointTests(ApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Get_health_returns_200_and_healthy()
    {
        HttpResponseMessage response = await _client.GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Healthy", await response.Content.ReadAsStringAsync());
    }
}
