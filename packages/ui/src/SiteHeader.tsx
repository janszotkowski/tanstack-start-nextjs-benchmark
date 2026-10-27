import type { LinkComponent } from './link.ts';

export type SiteHeaderProps = {
    Link: LinkComponent;
    framework: string;
};

const NAV = [
    { href: '/', label: 'Home' },
    { href: '/blog', label: 'Blog' },
    { href: '/products', label: 'Products' },
    { href: '/dashboard', label: 'Dashboard' },
] as const;

export const SiteHeader = (props: SiteHeaderProps) => {
    const Link = props.Link;
    return (
        <header className={'border-b border-neutral-200 dark:border-neutral-800'}>
            <div className={'mx-auto flex h-14 max-w-5xl items-center justify-between px-4'}>
                <Link
                    href={'/'}
                    className={'font-semibold tracking-tight'}
                >
                    Bench
                    <span className={'ml-2 font-mono text-xs text-neutral-500'}>{props.framework}</span>
                </Link>
                <nav className={'flex gap-5 text-sm'}>
                    {NAV.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'}
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>
            </div>
        </header>
    );
};
