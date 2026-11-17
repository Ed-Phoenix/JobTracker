using ClosedXML.Excel;
using JobTracker.Application.Applications;
using JobTracker.Application.Applications.Export;

namespace JobTracker.Infrastructure.Export;

/// <summary>
/// Excel workbook built with ClosedXML. Unlike CSV, cells are typed: dates are real dates and
/// salaries real numbers, so they sort and add up in Excel. Values are written as values,
/// never as formulas, so text like "=1+1" cannot execute.
/// </summary>
public class XlsxApplicationExportWriter : IApplicationExportWriter
{
    public ExportFormat Format => ExportFormat.Xlsx;

    public string ContentType => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    public string FileExtension => "xlsx";

    public byte[] Write(IReadOnlyList<ApplicationExportRow> rows)
    {
        using XLWorkbook workbook = new();
        IXLWorksheet sheet = workbook.Worksheets.Add("Applications");

        for (int column = 0; column < ApplicationExportRow.Headers.Count; column++)
        {
            sheet.Cell(1, column + 1).Value = ApplicationExportRow.Headers[column];
        }

        for (int index = 0; index < rows.Count; index++)
        {
            ApplicationExportRow row = rows[index];
            IXLRow line = sheet.Row(index + 2);

            line.Cell(1).Value = row.Company;
            line.Cell(2).Value = row.Position;
            line.Cell(3).Value = row.Status;
            line.Cell(4).Value = row.Source;
            line.Cell(5).Value = row.WorkMode;
            line.Cell(6).Value = row.Location;
            line.Cell(7).Value = row.SalaryAmount;
            line.Cell(8).Value = row.SalaryCurrency;
            line.Cell(9).Value = row.AppliedOn.ToDateTime(TimeOnly.MinValue);
            line.Cell(10).Value = row.LastActivityOn.ToDateTime(TimeOnly.MinValue);
            line.Cell(11).Value = row.NeedsFollowUp ? "Yes" : "No";
            line.Cell(12).Value = row.JobUrl;
            line.Cell(13).Value = row.Notes;
        }

        sheet.Column(7).Style.NumberFormat.Format = "#,##0.00";
        sheet.Columns(9, 10).Style.DateFormat.Format = "yyyy-mm-dd";

        IXLRow header = sheet.Row(1);
        header.Style.Font.Bold = true;
        header.Style.Fill.BackgroundColor = XLColor.FromHtml("#EEF2FF");

        // Header stays visible while scrolling, and every column gets a filter dropdown.
        sheet.SheetView.FreezeRows(1);
        sheet.Range(1, 1, rows.Count + 1, ApplicationExportRow.Headers.Count).SetAutoFilter();
        sheet.Columns(1, 12).AdjustToContents(1, Math.Min(rows.Count + 1, 200), 8, 60);
        sheet.Column(13).Width = 60;

        using MemoryStream stream = new();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }
}
