using JobTracker.Domain.Enums;

namespace JobTracker.Application.Dashboard;

public record StatusCount(ApplicationStatus Status, int Count);

/// <param name="WeekStart">Monday of the week.</param>
/// <param name="Count">Applications sent that week.</param>
public record WeekCount(DateOnly WeekStart, int Count);

/// <param name="Total">All applications of the user.</param>
/// <param name="ResponseRate">Fraction (0 to 1) of applications that got any answer from the company.</param>
/// <param name="ByStatus">One entry per status, including those with zero, in pipeline order.</param>
/// <param name="PerWeek">The last 12 weeks, oldest first, including weeks with zero.</param>
/// <param name="NeedsFollowUpCount">Open applications without recent activity.</param>
public record DashboardSummaryResponse(
    int Total,
    double ResponseRate,
    IReadOnlyList<StatusCount> ByStatus,
    IReadOnlyList<WeekCount> PerWeek,
    int NeedsFollowUpCount);
