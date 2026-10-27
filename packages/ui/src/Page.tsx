import type { ReactNode } from 'react';

export type PageProps = {
    title: string;
    lead?: string;
    children: ReactNode;
};

export const Page = (props: PageProps) => (
    <main className={'mx-auto max-w-5xl px-4 py-10'}>
        <h1 className={'text-3xl font-semibold tracking-tight'}>{props.title}</h1>
        {props.lead === undefined ? null : <p className={'mt-2 max-w-2xl text-neutral-600 dark:text-neutral-400'}>{props.lead}</p>}
        <div className={'mt-8'}>{props.children}</div>
    </main>
);
