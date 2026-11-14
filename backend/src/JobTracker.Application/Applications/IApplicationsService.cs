using JobTracker.Application.Common;

namespace JobTracker.Application.Applications;

public interface IApplicationsService
{
    Task<PagedResult<ApplicationSummaryResponse>> ListAsync(ApplicationListQuery query, CancellationToken cancellationToken);

    Task<ApplicationDetailResponse> GetAsync(Guid id, CancellationToken cancellationToken);

    Task<ApplicationDetailResponse> CreateAsync(SaveApplicationRequest request, CancellationToken cancellationToken);

    Task<ApplicationDetailResponse> UpdateAsync(Guid id, SaveApplicationRequest request, CancellationToken cancellationToken);

    Task<ApplicationDetailResponse> ChangeStatusAsync(Guid id, ChangeStatusRequest request, CancellationToken cancellationToken);
}
