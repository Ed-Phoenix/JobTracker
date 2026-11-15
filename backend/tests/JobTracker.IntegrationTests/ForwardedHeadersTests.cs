using System.Net;
using System.Net.Http.Json;
using JobTracker.Application.Auth;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace JobTracker.IntegrationTests;

/// <summary>
/// Behind a proxy every request arrives from the proxy's IP. With forwarded headers enabled the
/// rate limiter must partition by the real client (X-Forwarded-For), not by the proxy.
/// </summary>
[Collection(ApiCollection.Name)]
public class ForwardedHeadersTests
{
    private readonly ApiFactory _factory;

    public ForwardedHeadersTests(ApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Rate_limit_is_applied_per_forwarded_client_ip()
    {
        using WebApplicationFactory<Program> behindProxy = _factory.WithWebHostBuilder(builder => builder
            .UseSetting("RateLimiting:AuthPermitLimit", "2")
            .UseSetting("ForwardedHeaders:Enabled", "true"));
        HttpClient client = behindProxy.CreateClient();
        LoginRequest request = new($"user-{Guid.NewGuid():N}@test.dev", "Passw0rd-Test");

        // Client A uses its two attempts and is then limited...
        await LoginFromAsync(client, "203.0.113.10", request);
        await LoginFromAsync(client, "203.0.113.10", request);
        HttpResponseMessage clientAThird = await LoginFromAsync(client, "203.0.113.10", request);

        // ...while client B, behind the same proxy, still has its own budget.
        HttpResponseMessage clientBFirst = await LoginFromAsync(client, "198.51.100.20", request);

        Assert.Equal(HttpStatusCode.TooManyRequests, clientAThird.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, clientBFirst.StatusCode);
    }

    private static Task<HttpResponseMessage> LoginFromAsync(HttpClient client, string clientIp, LoginRequest body)
    {
        HttpRequestMessage message = new(HttpMethod.Post, "/api/auth/login") { Content = JsonContent.Create(body) };
        message.Headers.Add("X-Forwarded-For", clientIp);
        return client.SendAsync(message);
    }
}
