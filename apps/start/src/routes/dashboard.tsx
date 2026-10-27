import { METRIC_ROW_COUNT } from '@bench/data';
import { Dashboard, Page } from '@bench/ui';
import { fetchMetricRows } from '@server/data';
import { createFileRoute } from '@tanstack/react-router';

const DashboardPage = () => (
    <Page
        title={'Dashboard'}
        lead={`${METRIC_ROW_COUNT.toLocaleString('en-US')} rows, filtered, sorted and aggregated in the browser.`}
    >
        <Dashboard rows={Route.useLoaderData()} />
    </Page>
);

export const Route = createFileRoute('/dashboard')({
    loader: () => fetchMetricRows(),
    component: DashboardPage,
});
