namespace JobTracker.Application.Dashboard;

/// <summary>
/// Pure functions (no database, no clock) to group dates into Monday-to-Sunday weeks.
/// Kept separate so they can be unit tested with fixed dates.
/// </summary>
public static class WeeklyBuckets
{
    public static DateOnly WeekStart(DateOnly date)
    {
        // DayOfWeek: Sunday = 0, Monday = 1 ... Saturday = 6. Days since the last Monday:
        int daysSinceMonday = ((int)date.DayOfWeek + 6) % 7;
        return date.AddDays(-daysSinceMonday);
    }

    /// <summary>First Monday of a window of <paramref name="weeks"/> weeks that ends in the week of <paramref name="today"/>.</summary>
    public static DateOnly WindowStart(DateOnly today, int weeks) =>
        WeekStart(today).AddDays(-7 * (weeks - 1));

    /// <summary>
    /// Turns "count per day" into "count per week", oldest first, adding the weeks with zero
    /// so a chart shows a continuous axis.
    /// </summary>
    public static IReadOnlyList<WeekCount> Build(IReadOnlyDictionary<DateOnly, int> countsByDate, DateOnly today, int weeks)
    {
        DateOnly windowStart = WindowStart(today, weeks);

        return Enumerable.Range(0, weeks)
            .Select(index => windowStart.AddDays(7 * index))
            .Select(weekStart => new WeekCount(
                weekStart,
                countsByDate.Where(day => WeekStart(day.Key) == weekStart).Sum(day => day.Value)))
            .ToList();
    }
}
