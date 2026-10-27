import { searchProducts } from '@bench/data';

export const GET = (request: Request) => {
    const q = new URL(request.url).searchParams.get('q') ?? '';
    return Response.json(searchProducts(q));
};
