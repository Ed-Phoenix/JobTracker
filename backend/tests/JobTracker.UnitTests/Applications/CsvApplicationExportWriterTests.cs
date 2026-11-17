using System.Text;
using JobTracker.Application.Applications.Export;

namespace JobTracker.UnitTests.Applications;

public class CsvApplicationExportWriterTests
{
    private readonly CsvApplicationExportWriter _writer = new();

    [Fact]
    public void Writes_a_header_and_one_line_per_row_with_crlf_endings()
    {
        string csv = Write(Row());

        Assert.Equal(
            "Company,Position,Status,Source,Work mode,Location,Salary,Currency,Applied on,Last activity,Needs follow-up,Job URL,Notes\r\n" +
            "Acme,Developer,HR interview,LinkedIn,Remote,Querétaro,45000.50,MXN,2026-10-01,2026-10-20,Yes,https://acme.dev/jobs/1,\r\n",
            csv);
    }

    [Theory]
    [InlineData("Globex, Inc.", "\"Globex, Inc.\"")]
    [InlineData("The \"best\" job", "\"The \"\"best\"\" job\"")]
    [InlineData("Line one\nLine two", "\"Line one\nLine two\"")]
    public void Fields_with_commas_quotes_or_line_breaks_are_quoted(string notes, string expected)
    {
        string csv = Write(Row() with { Notes = notes });

        Assert.EndsWith("," + expected + "\r\n", csv);
    }

    [Theory]
    [InlineData("=SUM(A1:A9)")]
    [InlineData("+52 81 1234 5678")]
    [InlineData("-1")]
    [InlineData("@cmd")]
    public void Text_starting_with_a_formula_character_gets_an_apostrophe(string company)
    {
        string csv = Write(Row() with { Company = company });

        Assert.Contains("\r\n'" + company[0], csv);
    }

    [Fact]
    public void Starts_with_the_utf8_byte_order_mark()
    {
        byte[] bytes = _writer.Write([Row()]);

        Assert.Equal(Encoding.UTF8.GetPreamble(), bytes[..3]);
    }

    private string Write(params ApplicationExportRow[] rows) => Encoding.UTF8.GetString(_writer.Write(rows)[3..]);

    private static ApplicationExportRow Row() => new(
        "Acme", "Developer", "HR interview", "LinkedIn", "Remote", "Querétaro", 45000.50m, "MXN",
        new DateOnly(2026, 10, 1), new DateOnly(2026, 10, 20), true, "https://acme.dev/jobs/1", null);
}
