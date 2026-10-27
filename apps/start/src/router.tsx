import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

export const getRouter = () =>
    createRouter({
        routeTree,
        scrollRestoration: true,
        // Start's recommended default: preload a route's code and data when a link is hovered or focused.
        defaultPreload: 'intent',
    });

declare module '@tanstack/react-router' {
    // oxlint-disable-next-line typescript-eslint/consistent-type-definitions
    interface Register {
        router: ReturnType<typeof getRouter>;
    }
}
