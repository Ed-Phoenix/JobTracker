using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using JobTracker.Application.Auth;

namespace JobTracker.IntegrationTests;

public static class TestHelpers
{
    /// <summary>Same JSON conventions as the API: camelCase and enums as text.</summary>
    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    /// <summary>
    /// Registers a brand-new user and returns a client that sends their access token.
    /// A fresh user per test means tests never see each other's data.
    /// </summary>
    public static async Task<HttpClient> CreateAuthenticatedClientAsync(this ApiFactory factory)
    {
        HttpClient client = factory.CreateClient();

        HttpResponseMessage response = await client.PostAsJsonAsync(
            "/api/auth/register",
            new RegisterRequest("Test User", $"user-{Guid.NewGuid():N}@test.dev", "Passw0rd-Test"));
        response.EnsureSuccessStatusCode();

        AuthResponse? auth = await response.Content.ReadFromJsonAsync<AuthResponse>(Json);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.AccessToken);

        return client;
    }

    public static async Task<T> ReadAsync<T>(this HttpResponseMessage response)
    {
        T? value = await response.Content.ReadFromJsonAsync<T>(Json);
        return value ?? throw new InvalidOperationException("The response body was empty.");
    }
}
