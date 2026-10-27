'use client';

import { CATEGORIES, type MetricRow } from '@bench/data';
import { useMemo, useState } from 'react';
import { formatPrice, inputClass } from './classes.ts';

export type DashboardProps = {
    rows: MetricRow[];
};

type SortKey = 'date' | 'orders' | 'revenue' | 'conversion';

const COLUMNS: { key: SortKey; label: string }[] = [
    { key: 'date', label: 'Date' },
    { key: 'orders', label: 'Orders' },
    { key: 'revenue', label: 'Revenue' },
    { key: 'conversion', label: 'Conversion' },
];

type ChartProps = {
    points: { label: string; value: number }[];
};

/** Revenue per day as bars, drawn as one SVG: no chart library, so both apps ship the same code. */
const RevenueChart = (props: ChartProps) => {
    const max = Math.max(1, ...props.points.map((point) => point.value));
    const width = 960;
    const height = 200;
    const barWidth = width / Math.max(1, props.points.length);
    return (
        <svg
            viewBox={`0 0 ${width} ${height}`}
            className={'h-48 w-full border-y border-neutral-200 dark:border-neutral-800'}
            role={'img'}
            aria-label={'Revenue per day'}
        >
            {props.points.map((point, index) => {
                const barHeight = (point.value / max) * (height - 10);
                return (
                    <rect
                        key={point.label}
                        x={index * barWidth}
                        y={height - barHeight}
                        width={Math.max(1, barWidth - 1)}
                        height={barHeight}
                        className={'fill-neutral-800 dark:fill-neutral-200'}
                    >
                        <title>{`${point.label}: ${formatPrice(point.value)}`}</title>
                    </rect>
                );
            })}
        </svg>
    );
};

/**
 * Deliberately heavy on the client: all rows go to the browser and every filter, sort and aggregate runs there,
 * with no virtualization. This is what the hydration, TBT and INP numbers measure.
 */
export const Dashboard = (props: DashboardProps) => {
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('date');
    const [descending, setDescending] = useState(false);

    const filtered = useMemo(() => {
        const needle = search.trim().toLowerCase();
        const rows = props.rows.filter((row) => (category === '' || row.category === category) && (needle === '' || row.region.toLowerCase().includes(needle) || row.date.includes(needle)));
        const direction = descending ? -1 : 1;
        return rows.sort((a, b) => (a[sortKey] < b[sortKey] ? -direction : a[sortKey] > b[sortKey] ? direction : a.id - b.id));
    }, [props.rows, search, category, sortKey, descending]);

    const perDay = useMemo(() => {
        const totals = new Map<string, number>();
        for (const row of filtered) totals.set(row.date, (totals.get(row.date) ?? 0) + row.revenue);
        return [...totals.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([label, value]) => ({ label, value }));
    }, [filtered]);

    const revenue = filtered.reduce((sum, row) => sum + row.revenue, 0);
    const orders = filtered.reduce((sum, row) => sum + row.orders, 0);

    const toggleSort = (key: SortKey) => {
        if (key === sortKey) setDescending(!descending);
        else {
            setSortKey(key);
            setDescending(key !== 'date');
        }
    };

    return (
        <div>
            <div className={'grid gap-3 sm:grid-cols-[1fr_14rem]'}>
                <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={'Filter by region or date'}
                    aria-label={'Filter rows'}
                    className={inputClass}
                />
                <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    aria-label={'Category'}
                    className={inputClass}
                >
                    <option value={''}>All categories</option>
                    {CATEGORIES.map((item) => (
                        <option
                            key={item}
                            value={item}
                        >
                            {item}
                        </option>
                    ))}
                </select>
            </div>
            <dl className={'mt-6 grid grid-cols-3 divide-x divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800'}>
                {[
                    ['Rows', filtered.length.toLocaleString('en-US')],
                    ['Orders', orders.toLocaleString('en-US')],
                    ['Revenue', formatPrice(revenue)],
                ].map(([label, value]) => (
                    <div
                        key={label}
                        className={'px-4 py-3'}
                    >
                        <dt className={'text-xs text-neutral-500'}>{label}</dt>
                        <dd className={'mt-1 font-mono text-lg'}>{value}</dd>
                    </div>
                ))}
            </dl>
            <div className={'mt-6'}>
                <RevenueChart points={perDay} />
            </div>
            <table className={'mt-6 w-full border-y border-neutral-200 text-sm dark:border-neutral-800'}>
                <thead>
                    <tr className={'border-b border-neutral-200 text-left dark:border-neutral-800'}>
                        <th className={'py-2 font-medium'}>Region</th>
                        <th className={'py-2 font-medium'}>Category</th>
                        {COLUMNS.map((column) => (
                            <th
                                key={column.key}
                                className={'py-2 text-right font-medium'}
                            >
                                <button
                                    type={'button'}
                                    onClick={() => toggleSort(column.key)}
                                >
                                    {column.label}
                                    {column.key === sortKey ? (descending ? ' ↓' : ' ↑') : ''}
                                </button>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className={'divide-y divide-neutral-100 font-mono dark:divide-neutral-900'}>
                    {filtered.map((row) => (
                        <tr key={row.id}>
                            <td className={'py-1 font-sans'}>{row.region}</td>
                            <td className={'py-1 font-sans'}>{row.category}</td>
                            <td className={'py-1 text-right'}>{row.date}</td>
                            <td className={'py-1 text-right'}>{row.orders}</td>
                            <td className={'py-1 text-right'}>{formatPrice(row.revenue)}</td>
                            <td className={'py-1 text-right'}>{(row.conversion * 100).toFixed(1)} %</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
