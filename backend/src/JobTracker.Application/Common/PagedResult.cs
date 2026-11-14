namespace JobTracker.Application.Common;

/// <summary>
/// One page of results plus what the client needs to render a pagination control.
/// </summary>
public record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount)
{
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
}
