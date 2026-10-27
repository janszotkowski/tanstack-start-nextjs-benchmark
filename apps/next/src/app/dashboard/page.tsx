import { getMetricRows, METRIC_ROW_COUNT } from '@bench/data';
import { Dashboard, Page } from '@bench/ui';

export default function DashboardPage() {
    return (
        <Page
            title={'Dashboard'}
            lead={`${METRIC_ROW_COUNT.toLocaleString('en-US')} rows, filtered, sorted and aggregated in the browser.`}
        >
            <Dashboard rows={getMetricRows()} />
        </Page>
    );
}
