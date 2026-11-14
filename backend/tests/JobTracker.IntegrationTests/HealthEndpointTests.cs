using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;

namespace JobTracker.IntegrationTests;

/// <summary>
/// WebApplicationFactory boots the real API in memory (same Program.cs, same pipeline)
/// and gives us an HttpClient to call it, without opening a network port.
/// </summary>
public class HealthEndpointTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public HealthEndpointTests(WebApplicationFactory<Program> factory)
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
