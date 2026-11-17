using System.Globalization;
using System.Text;

namespace JobTracker.Application.Applications.Export;

/// <summary>
/// CSV following RFC 4180: comma separated, CRLF line endings, fields with commas, quotes or
/// line breaks wrapped in quotes, and quotes inside a field doubled.
/// </summary>
public class CsvApplicationExportWriter : IApplicationExportWriter
{
    // Characters that make Excel or Google Sheets treat a cell as a formula.
    private static readonly char[] FormulaTriggers = ['=', '+', '-', '@', '\t', '\r'];

    public ExportFormat Format => ExportFormat.Csv;

    public string ContentType => "text/csv; charset=utf-8";

    public string FileExtension => "csv";

    public byte[] Write(IReadOnlyList<ApplicationExportRow> rows)
    {
        StringBuilder csv = new();
        AppendLine(csv, ApplicationExportRow.Headers);

        foreach (ApplicationExportRow row in rows)
        {
            AppendLine(csv,
            [
                Text(row.Company),
                Text(row.Position),
                row.Status,
                row.Source,
                row.WorkMode,
                Text(row.Location),
                // Invariant culture and two decimals: always "45000.50", never "45000,50", whatever the server locale is.
                row.SalaryAmount?.ToString("0.00", CultureInfo.InvariantCulture) ?? "",
                row.SalaryCurrency,
                row.AppliedOn.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                row.LastActivityOn.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                row.NeedsFollowUp ? "Yes" : "No",
                Text(row.JobUrl),
                Text(row.Notes),
            ]);
        }

        // The byte order mark tells Excel the file is UTF-8, so "Querétaro" does not turn into "QuerÃ©taro".
        return [.. Encoding.UTF8.GetPreamble(), .. Encoding.UTF8.GetBytes(csv.ToString())];
    }

    /// <summary>
    /// CSV injection guard (OWASP): text typed by the user, such as a company named
    /// "=HYPERLINK(...)", must never run as a formula when the file is opened. A leading
    /// apostrophe makes the spreadsheet show it as plain text.
    /// </summary>
    internal static string Text(string? value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return "";
        }

        return FormulaTriggers.Contains(value[0]) ? "'" + value : value;
    }

    private static void AppendLine(StringBuilder csv, IEnumerable<string> fields)
    {
        csv.AppendJoin(',', fields.Select(Escape));
        csv.Append("\r\n");
    }

    private static string Escape(string field) =>
        field.IndexOfAny([',', '"', '\r', '\n']) >= 0
            ? $"\"{field.Replace("\"", "\"\"")}\""
            : field;
}
