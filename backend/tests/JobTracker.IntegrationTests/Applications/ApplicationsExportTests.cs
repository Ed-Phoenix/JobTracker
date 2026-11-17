using System.Net;
using System.Net.Http.Json;
using System.Text;
using ClosedXML.Excel;
using JobTracker.Application.Applications;
using JobTracker.Domain.Enums;
using Microsoft.AspNetCore.Mvc;

namespace JobTracker.IntegrationTests.Applications;

[Collection(ApiCollection.Name)]
public class ApplicationsExportTests
{
    private const string Url = "/api/applications";

    private readonly ApiFactory _factory;

    public ApplicationsExportTests(ApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Csv_export_downloads_every_matching_application_with_a_header_row()
    {
        HttpClient client = await _factory.CreateAuthenticatedClientAsync();
        await CreateAsync(client, "Acme", ApplicationSource.LinkedIn);
        await CreateAsync(client, "Globex, Inc.", ApplicationSource.Referral);

        HttpResponseMessage response = await client.GetAsync($"{Url}/export?format=csv&sortBy=company&sortDir=asc");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/csv", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal("attachment", response.Content.Headers.ContentDisposition?.DispositionType);
        Assert.Matches(@"^jobtracker-applications-\d{4}-\d{2}-\d{2}\.csv$", response.Content.Headers.ContentDisposition?.FileNameStar);

        string[] lines = (await ReadCsvAsync(response)).Split("\r\n", StringSplitOptions.RemoveEmptyEntries);
        Assert.Equal(3, lines.Length);
        Assert.StartsWith("Company,Position,Status,Source", lines[0]);
        Assert.StartsWith("Acme,Junior Developer,Applied,LinkedIn,Hybrid,Monterrey,18000.00,MXN,2026-10-15", lines[1]);
        // A comma inside a value means the field is quoted.
        Assert.StartsWith("\"Globex, Inc.\",Junior Developer,Applied,Referral", lines[2]);
    }

    [Fact]
    public async Task Export_applies_the_same_filters_as_the_list_and_only_includes_the_users_own_data()
    {
        HttpClient client = await _factory.CreateAuthenticatedClientAsync();
        await CreateAsync(client, "Acme", ApplicationSource.LinkedIn);
        await CreateAsync(client, "Initech", ApplicationSource.Referral);

        HttpClient stranger = await _factory.CreateAuthenticatedClientAsync();
        await CreateAsync(stranger, "Hidden Corp", ApplicationSource.Referral);

        HttpResponseMessage response = await client.GetAsync($"{Url}/export?source=Referral");

        string csv = await ReadCsvAsync(response);
        Assert.Contains("Initech", csv);
        Assert.DoesNotContain("Acme", csv);
        Assert.DoesNotContain("Hidden Corp", csv);
    }

    [Fact]
    public async Task Text_that_looks_like_a_formula_is_neutralised_in_csv()
    {
        HttpClient client = await _factory.CreateAuthenticatedClientAsync();
        await CreateAsync(client, "=HYPERLINK(\"http://evil.example\",\"Click\")", ApplicationSource.Other);

        string csv = await ReadCsvAsync(await client.GetAsync($"{Url}/export"));

        Assert.Contains("\"'=HYPERLINK(\"\"http://evil.example\"\",\"\"Click\"\")\"", csv);
    }

    [Fact]
    public async Task Excel_export_is_a_workbook_with_typed_cells()
    {
        HttpClient client = await _factory.CreateAuthenticatedClientAsync();
        await CreateAsync(client, "Acme", ApplicationSource.CompanyWebsite);

        HttpResponseMessage response = await client.GetAsync($"{Url}/export?format=xlsx");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            response.Content.Headers.ContentType?.MediaType);
        Assert.EndsWith(".xlsx", response.Content.Headers.ContentDisposition?.FileNameStar);

        using XLWorkbook workbook = new(await response.Content.ReadAsStreamAsync());
        IXLWorksheet sheet = workbook.Worksheet("Applications");
        Assert.Equal("Company", sheet.Cell(1, 1).GetString());
        Assert.Equal("Acme", sheet.Cell(2, 1).GetString());
        Assert.Equal("Company website", sheet.Cell(2, 4).GetString());
        Assert.Equal(18000, sheet.Cell(2, 7).GetDouble());
        Assert.Equal(new DateTime(2026, 10, 15), sheet.Cell(2, 9).GetDateTime());
    }

    [Fact]
    public async Task Unknown_format_returns_400()
    {
        HttpClient client = await _factory.CreateAuthenticatedClientAsync();

        HttpResponseMessage response = await client.GetAsync($"{Url}/export?format=pdf");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("format", (await response.ReadAsync<ValidationProblemDetails>()).Errors.Keys);
    }

    [Fact]
    public async Task Export_requires_authentication()
    {
        HttpResponseMessage response = await _factory.CreateClient().GetAsync($"{Url}/export");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private static async Task CreateAsync(HttpClient client, string company, ApplicationSource source)
    {
        SaveApplicationRequest request = new(company, "Junior Developer", null, "Monterrey", WorkMode.Hybrid, 18000, null,
            new DateOnly(2026, 10, 15), source, null);

        (await client.PostAsJsonAsync(Url, request, TestHelpers.Json)).EnsureSuccessStatusCode();
    }

    private static async Task<string> ReadCsvAsync(HttpResponseMessage response)
    {
        response.EnsureSuccessStatusCode();
        byte[] bytes = await response.Content.ReadAsByteArrayAsync();

        // The file starts with the UTF-8 byte order mark so Excel reads accents correctly.
        Assert.Equal(Encoding.UTF8.GetPreamble(), bytes[..3]);
        return Encoding.UTF8.GetString(bytes[3..]);
    }
}
