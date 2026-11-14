using JobTracker.Application.Dashboard;

namespace JobTracker.UnitTests.Dashboard;

public class WeeklyBucketsTests
{
    [Theory]
    [InlineData("2026-11-09", "2026-11-09")] // Monday stays
    [InlineData("2026-11-11", "2026-11-09")] // Wednesday
    [InlineData("2026-11-15", "2026-11-09")] // Sunday belongs to the week that started on Monday
    [InlineData("2026-11-16", "2026-11-16")] // next Monday
    public void WeekStart_returns_the_monday_of_the_week(string date, string expectedMonday)
    {
        Assert.Equal(DateOnly.Parse(expectedMonday), WeeklyBuckets.WeekStart(DateOnly.Parse(date)));
    }

    [Fact]
    public void Build_returns_every_week_oldest_first_including_empty_ones()
    {
        DateOnly today = new(2026, 11, 14); // Saturday, week of Monday Nov 9
        Dictionary<DateOnly, int> countsByDate = new()
        {
            [new DateOnly(2026, 11, 9)] = 2,   // current week
            [new DateOnly(2026, 11, 14)] = 1,  // current week
            [new DateOnly(2026, 10, 28)] = 3,  // week of Oct 26
        };

        IReadOnlyList<WeekCount> weeks = WeeklyBuckets.Build(countsByDate, today, weeks: 4);

        Assert.Equal(
            [
                new WeekCount(new DateOnly(2026, 10, 19), 0),
                new WeekCount(new DateOnly(2026, 10, 26), 3),
                new WeekCount(new DateOnly(2026, 11, 2), 0),
                new WeekCount(new DateOnly(2026, 11, 9), 3),
            ],
            weeks);
    }

    [Fact]
    public void WindowStart_is_the_monday_of_the_oldest_week()
    {
        Assert.Equal(new DateOnly(2026, 8, 24), WeeklyBuckets.WindowStart(new DateOnly(2026, 11, 14), weeks: 12));
    }
}
