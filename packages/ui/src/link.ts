import type { ComponentType, ReactNode } from 'react';

export type LinkProps = {
    href: string;
    className?: string;
    children: ReactNode;
};

/**
 * Each app passes its own router link (`next/link`, or a wrapper around TanStack Router's `Link`),
 * so the markup stays shared and only navigation is framework-specific.
 */
export type LinkComponent = ComponentType<LinkProps>;
