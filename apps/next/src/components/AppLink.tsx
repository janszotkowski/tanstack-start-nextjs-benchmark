import type { LinkProps } from '@bench/ui';
import type { Route } from 'next';
import Link from 'next/link';

/** The shared components take plain string hrefs; Next's typed routes are checked in the app's own links. */
export const AppLink = (props: LinkProps) => (
    <Link
        href={props.href as Route}
        className={props.className}
    >
        {props.children}
    </Link>
);
