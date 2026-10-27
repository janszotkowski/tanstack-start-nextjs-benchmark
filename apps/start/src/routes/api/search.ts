import { searchProducts } from '@bench/data';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/search')({
    server: {
        handlers: {
            GET: (context) => Response.json(searchProducts(new URL(context.request.url).searchParams.get('q') ?? '')),
        },
    },
});
