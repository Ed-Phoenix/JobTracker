using JobTracker.Application.Applications;
using JobTracker.Application.Applications.Export;
using JobTracker.Application.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobTracker.Api.Controllers;

/// <summary>
/// [Authorize] on the class: every endpoint here requires a valid access token.
/// </summary>
[ApiController]
[Authorize]
[Route("api/applications")]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
public class ApplicationsController : ControllerBase
{
    private readonly IApplicationsService _applicationsService;

    public ApplicationsController(IApplicationsService applicationsService)
    {
        _applicationsService = applicationsService;
    }

    /// <summary>Paginated list with search, filters and sorting, all executed in the database.</summary>
    [HttpGet]
    [ProducesResponseType<PagedResult<ApplicationSummaryResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PagedResult<ApplicationSummaryResponse>>> List(
        [FromQuery] ApplicationListQuery query, CancellationToken cancellationToken)
    {
        return await _applicationsService.ListAsync(query, cancellationToken);
    }

    /// <summary>
    /// Downloads every application matching the filters as CSV or Excel (format=csv|xlsx).
    /// Same query string as the list, minus paging.
    /// </summary>
    [HttpGet("export")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK, "text/csv",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Export([FromQuery] ApplicationExportQuery query, CancellationToken cancellationToken)
    {
        ExportFile file = await _applicationsService.ExportAsync(query, cancellationToken);

        // File(...) sets Content-Disposition: attachment; filename=..., so the browser downloads it.
        return File(file.Content, file.ContentType, file.FileName);
    }

    // ":guid" is a route constraint: /api/applications/abc does not even match this action (404).
    [HttpGet("{id:guid}")]
    [ProducesResponseType<ApplicationDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApplicationDetailResponse>> Get(Guid id, CancellationToken cancellationToken)
    {
        return await _applicationsService.GetAsync(id, cancellationToken);
    }

    [HttpPost]
    [ProducesResponseType<ApplicationDetailResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApplicationDetailResponse>> Create(SaveApplicationRequest request, CancellationToken cancellationToken)
    {
        ApplicationDetailResponse created = await _applicationsService.CreateAsync(request, cancellationToken);

        // 201 Created + a Location header pointing to the new resource.
        return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType<ApplicationDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApplicationDetailResponse>> Update(Guid id, SaveApplicationRequest request, CancellationToken cancellationToken)
    {
        return await _applicationsService.UpdateAsync(id, request, cancellationToken);
    }

    /// <summary>
    /// POST, not PUT/PATCH: each call appends a row to the status history, so it is not idempotent.
    /// </summary>
    [HttpPost("{id:guid}/status")]
    [ProducesResponseType<ApplicationDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ApplicationDetailResponse>> ChangeStatus(Guid id, ChangeStatusRequest request, CancellationToken cancellationToken)
    {
        return await _applicationsService.ChangeStatusAsync(id, request, cancellationToken);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await _applicationsService.DeleteAsync(id, cancellationToken);

        // 204 No Content: success, and there is nothing left to return.
        return NoContent();
    }
}
