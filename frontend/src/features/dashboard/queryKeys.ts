/** Cache keys of the dashboard. Writes to applications invalidate them so the metrics stay current. */
export const dashboardKeys = {
  all: ['dashboard'] as const,
  summary: () => [...dashboardKeys.all, 'summary'] as const,
}
