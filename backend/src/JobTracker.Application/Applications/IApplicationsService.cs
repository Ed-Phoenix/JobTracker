using JobTracker.Application.Applications.Export;
using JobTracker.Application.Common;

namespace JobTracker.Application.Applications;

public interface IApplicationsService
{
    Task<PagedResult<ApplicationSummaryResponse>> ListAsync(ApplicationListQuery query, CancellationToken cancellationToken);

    /// <summary>Every application matching the filters (up to a limit), as a CSV or Excel file.</summary>
    Task<ExportFile> ExportAsync(ApplicationExportQuery query, CancellationToken cancellationToken);

    Task<ApplicationDetailResponse> GetAsync(Guid id, CancellationToken cancellationToken);

    Task<ApplicationDetailResponse> CreateAsync(SaveApplicationRequest request, CancellationToken cancellationToken);

    Task<ApplicationDetailResponse> UpdateAsync(Guid id, SaveApplicationRequest request, CancellationToken cancellationToken);

    Task<ApplicationDetailResponse> ChangeStatusAsync(Guid id, ChangeStatusRequest request, CancellationToken cancellationToken);

    Task DeleteAsync(Guid id, CancellationToken cancellationToken);
}
