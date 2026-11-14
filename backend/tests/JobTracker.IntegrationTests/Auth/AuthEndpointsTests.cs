using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using JobTracker.Application.Auth;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;

namespace JobTracker.IntegrationTests.Auth;

[Collection(ApiCollection.Name)]
public class AuthEndpointsTests
{
    private const string Password = "Passw0rd-Test";
    private const string RefreshCookie = "jobtracker_refresh";

    private readonly ApiFactory _factory;
    private readonly HttpClient _client;

    public AuthEndpointsTests(ApiFactory factory)
    {
        _factory = factory;

        // Cookies are handled by hand so each test controls exactly which refresh token it sends.
        _client = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });
    }

    [Fact]
    public async Task Register_returns_access_token_and_sets_httponly_refresh_cookie()
    {
        string email = NewEmail();

        HttpResponseMessage response = await RegisterAsync(email);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        AuthResponse? body = await response.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(body);
        Assert.NotEmpty(body.AccessToken);
        Assert.Equal(email, body.User.Email);
        Assert.Equal(7, body.User.FollowUpDays);

        string setCookie = Assert.Single(response.Headers.GetValues("Set-Cookie"));
        Assert.StartsWith($"{RefreshCookie}=", setCookie);
        Assert.Contains("httponly", setCookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("samesite=strict", setCookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("path=/api/auth", setCookie, StringComparison.OrdinalIgnoreCase);

        // The refresh token must never appear in the JSON body.
        Assert.DoesNotContain(RefreshCookieValue(response), await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Register_with_an_existing_email_returns_409()
    {
        string email = NewEmail();
        await RegisterAsync(email);

        HttpResponseMessage response = await RegisterAsync(email);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task Register_with_invalid_data_returns_400_with_errors_per_field()
    {
        HttpResponseMessage response = await _client.PostAsJsonAsync(
            "/api/auth/register", new RegisterRequest("", "not-an-email", "weak"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        ValidationProblemDetails? problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.NotNull(problem);
        Assert.Contains("fullName", problem.Errors.Keys);
        Assert.Contains("email", problem.Errors.Keys);
        Assert.Contains("password", problem.Errors.Keys);
    }

    [Fact]
    public async Task Login_with_valid_credentials_returns_a_token_that_can_call_me()
    {
        string email = NewEmail();
        await RegisterAsync(email);

        HttpResponseMessage login = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, Password));
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        AuthResponse? auth = await login.Content.ReadFromJsonAsync<AuthResponse>();

        HttpResponseMessage me = await SendAsync(HttpMethod.Get, "/api/auth/me", accessToken: auth!.AccessToken);

        Assert.Equal(HttpStatusCode.OK, me.StatusCode);
        UserResponse? user = await me.Content.ReadFromJsonAsync<UserResponse>();
        Assert.Equal(email, user!.Email);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Login_with_wrong_password_or_unknown_email_returns_the_same_401(bool userExists)
    {
        string email = NewEmail();
        if (userExists)
        {
            await RegisterAsync(email);
        }

        HttpResponseMessage response = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, "Wrong-Passw0rd"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        ProblemDetails? problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.Equal("Invalid email or password.", problem!.Detail);
    }

    [Fact]
    public async Task Me_without_a_token_returns_401()
    {
        HttpResponseMessage response = await _client.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Me_with_a_tampered_token_returns_401()
    {
        HttpResponseMessage register = await RegisterAsync(NewEmail());
        AuthResponse? auth = await register.Content.ReadFromJsonAsync<AuthResponse>();

        // Changing the signature must invalidate the token.
        string tampered = auth!.AccessToken[..^4] + "AAAA";
        HttpResponseMessage response = await SendAsync(HttpMethod.Get, "/api/auth/me", accessToken: tampered);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Refresh_rotates_the_refresh_token_and_returns_a_new_access_token()
    {
        HttpResponseMessage register = await RegisterAsync(NewEmail());
        string firstCookie = RefreshCookieValue(register);

        HttpResponseMessage refresh = await SendAsync(HttpMethod.Post, "/api/auth/refresh", refreshCookie: firstCookie);

        Assert.Equal(HttpStatusCode.OK, refresh.StatusCode);
        AuthResponse? auth = await refresh.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotEmpty(auth!.AccessToken);
        Assert.NotEqual(firstCookie, RefreshCookieValue(refresh));
    }

    [Fact]
    public async Task Refresh_without_a_cookie_returns_401()
    {
        HttpResponseMessage response = await SendAsync(HttpMethod.Post, "/api/auth/refresh");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Reusing_a_rotated_refresh_token_returns_401_and_revokes_the_whole_session()
    {
        HttpResponseMessage register = await RegisterAsync(NewEmail());
        string firstCookie = RefreshCookieValue(register);

        HttpResponseMessage refresh = await SendAsync(HttpMethod.Post, "/api/auth/refresh", refreshCookie: firstCookie);
        string secondCookie = RefreshCookieValue(refresh);

        // The first token was already used once: presenting it again looks like theft.
        HttpResponseMessage reuse = await SendAsync(HttpMethod.Post, "/api/auth/refresh", refreshCookie: firstCookie);
        Assert.Equal(HttpStatusCode.Unauthorized, reuse.StatusCode);

        // ...so the newest token is revoked as well.
        HttpResponseMessage afterReuse = await SendAsync(HttpMethod.Post, "/api/auth/refresh", refreshCookie: secondCookie);
        Assert.Equal(HttpStatusCode.Unauthorized, afterReuse.StatusCode);
    }

    [Fact]
    public async Task Logout_revokes_the_refresh_token_and_clears_the_cookie()
    {
        HttpResponseMessage register = await RegisterAsync(NewEmail());
        string cookie = RefreshCookieValue(register);

        HttpResponseMessage logout = await SendAsync(HttpMethod.Post, "/api/auth/logout", refreshCookie: cookie);

        Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);
        Assert.Contains("expires=Thu, 01 Jan 1970", Assert.Single(logout.Headers.GetValues("Set-Cookie")));

        HttpResponseMessage refresh = await SendAsync(HttpMethod.Post, "/api/auth/refresh", refreshCookie: cookie);
        Assert.Equal(HttpStatusCode.Unauthorized, refresh.StatusCode);
    }

    [Fact]
    public async Task Update_profile_changes_name_and_follow_up_days()
    {
        HttpResponseMessage register = await RegisterAsync(NewEmail());
        AuthResponse? auth = await register.Content.ReadFromJsonAsync<AuthResponse>();

        HttpResponseMessage update = await SendAsync(
            HttpMethod.Patch, "/api/auth/me", accessToken: auth!.AccessToken, body: new UpdateProfileRequest("New Name", 14));

        Assert.Equal(HttpStatusCode.OK, update.StatusCode);

        HttpResponseMessage me = await SendAsync(HttpMethod.Get, "/api/auth/me", accessToken: auth.AccessToken);
        UserResponse? user = await me.Content.ReadFromJsonAsync<UserResponse>();
        Assert.Equal("New Name", user!.FullName);
        Assert.Equal(14, user.FollowUpDays);
    }

    [Fact]
    public async Task Update_profile_with_follow_up_days_out_of_range_returns_400()
    {
        HttpResponseMessage register = await RegisterAsync(NewEmail());
        AuthResponse? auth = await register.Content.ReadFromJsonAsync<AuthResponse>();

        HttpResponseMessage update = await SendAsync(
            HttpMethod.Patch, "/api/auth/me", accessToken: auth!.AccessToken, body: new UpdateProfileRequest("Name", 0));

        Assert.Equal(HttpStatusCode.BadRequest, update.StatusCode);
    }

    [Fact]
    public async Task Auth_endpoints_return_429_after_too_many_attempts()
    {
        // A second host over the same database, with a tiny limit, so this test does not affect the others.
        using WebApplicationFactory<Program> limitedFactory = _factory.WithWebHostBuilder(
            builder => builder.UseSetting("RateLimiting:AuthPermitLimit", "2"));
        HttpClient client = limitedFactory.CreateClient();
        LoginRequest request = new(NewEmail(), Password);

        await client.PostAsJsonAsync("/api/auth/login", request);
        await client.PostAsJsonAsync("/api/auth/login", request);
        HttpResponseMessage third = await client.PostAsJsonAsync("/api/auth/login", request);

        Assert.Equal(HttpStatusCode.TooManyRequests, third.StatusCode);
    }

    private static string NewEmail() => $"user-{Guid.NewGuid():N}@test.dev";

    private Task<HttpResponseMessage> RegisterAsync(string email) =>
        _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest("Test User", email, Password));

    private Task<HttpResponseMessage> SendAsync(
        HttpMethod method, string url, string? accessToken = null, string? refreshCookie = null, object? body = null)
    {
        HttpRequestMessage request = new(method, url);

        if (accessToken is not null)
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        }

        if (refreshCookie is not null)
        {
            request.Headers.Add("Cookie", $"{RefreshCookie}={refreshCookie}");
        }

        if (body is not null)
        {
            request.Content = JsonContent.Create(body);
        }

        return _client.SendAsync(request);
    }

    private static string RefreshCookieValue(HttpResponseMessage response)
    {
        string setCookie = response.Headers.GetValues("Set-Cookie").Single(value => value.StartsWith($"{RefreshCookie}="));
        return setCookie.Split(';')[0][(RefreshCookie.Length + 1)..];
    }
}
