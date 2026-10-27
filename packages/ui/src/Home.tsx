import { METRIC_ROW_COUNT, POST_COUNT, PRODUCT_COUNT } from '@bench/data';
import { Page } from './Page.tsx';
import type { LinkComponent } from './link.ts';

export type HomeProps = {
    Link: LinkComponent;
};

const SECTIONS = [
    { href: '/blog', title: 'Blog', text: `${POST_COUNT} prerendered posts. Measures build time and static serving.` },
    { href: '/products', title: 'Products', text: `${PRODUCT_COUNT} products with search, filters, sorting and pages. Server rendered on every request.` },
    { href: '/products/1', title: 'Product detail', text: 'A dynamic route with data loading and a review form (a mutation).' },
    { href: '/dashboard', title: 'Dashboard', text: `${METRIC_ROW_COUNT.toLocaleString('en-US')} rows rendered on the client. Measures hydration, TBT and INP.` },
] as const;

export const Home = (props: HomeProps) => {
    const Link = props.Link;
    return (
        <Page
            title={'Same app, two frameworks'}
            lead={'Every page here exists twice, with the same components and the same data. Only the framework underneath differs.'}
        >
            <ul className={'divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800'}>
                {SECTIONS.map((section) => (
                    <li key={section.href}>
                        <Link
                            href={section.href}
                            className={'grid gap-1 py-4 sm:grid-cols-[12rem_1fr]'}
                        >
                            <span className={'font-medium'}>{section.title}</span>
                            <span className={'text-sm text-neutral-600 dark:text-neutral-400'}>{section.text}</span>
                        </Link>
                    </li>
                ))}
            </ul>
        </Page>
    );
};
