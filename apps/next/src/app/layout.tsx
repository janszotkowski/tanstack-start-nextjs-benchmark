import { SiteHeader } from '@bench/ui';
import { AppLink } from '@components/AppLink';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
    title: 'Bench · Next.js',
    description: 'Next.js vs TanStack Start benchmark app',
};

type RootLayoutProps = {
    children: ReactNode;
};

export default function RootLayout(props: RootLayoutProps) {
    return (
        <html lang={'en'}>
            <body>
                <SiteHeader
                    Link={AppLink}
                    framework={'next'}
                />
                {props.children}
            </body>
        </html>
    );
}
