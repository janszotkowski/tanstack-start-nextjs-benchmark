import { CATEGORIES, type Category } from './products.ts';
import { createRandom } from './random.ts';

export type MetricRow = {
    id: number;
    date: string;
    region: string;
    category: Category;
    orders: number;
    revenue: number;
    conversion: number;
};

export const METRIC_ROW_COUNT = 5000;

const REGIONS = ['EU West', 'EU Central', 'US East', 'US West', 'APAC', 'LATAM'] as const;

const random = createRandom(3);

const ROWS: MetricRow[] = Array.from({ length: METRIC_ROW_COUNT }, (_, index) => {
    const orders = random.int(1, 400);
    return {
        id: index + 1,
        date: new Date(Date.UTC(2026, 0, 1) + Math.floor(index / 14) * 86_400_000).toISOString().slice(0, 10),
        region: random.pick(REGIONS),
        category: random.pick(CATEGORIES),
        orders,
        revenue: Math.round(orders * random.int(800, 30_000)) / 100,
        conversion: random.int(5, 120) / 1000,
    };
});

/** The dashboard data: 5,000 rows sent to the client and rendered there. */
export const getMetricRows = (): MetricRow[] => ROWS;
