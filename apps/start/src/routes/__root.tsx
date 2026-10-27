import { SiteHeader } from '@bench/ui';
import { AppLink } from '@components/AppLink';
import appCss from '@styles/app.css?url';
import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router';

const RootDocument = () => (
    <html lang={'en'}>
        <head>
            <HeadContent />
        </head>
        <body>
            <SiteHeader
                Link={AppLink}
                framework={'start'}
            />
            <Outlet />
            <Scripts />
        </body>
    </html>
);

export const Route = createRootRoute({
    head: () => ({
        meta: [
            { charSet: 'utf-8' },
            { name: 'viewport', content: 'width=device-width, initial-scale=1' },
            { title: 'Bench · TanStack Start' },
            { name: 'description', content: 'Next.js vs TanStack Start benchmark app' },
        ],
        links: [{ rel: 'stylesheet', href: appCss }],
    }),
    component: RootDocument,
});
