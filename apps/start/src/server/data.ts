import { addReview, getMetricRows, getPost, getPosts, getProduct, listProducts, parseCategory, parsePage, parseSort, type ProductQuery } from '@bench/data';
import { createServerFn } from '@tanstack/react-start';

// Loaders run on the server and in the browser. The data layer stays on the server behind server functions,
// the same split Next makes with server components; a client navigation calls these over HTTP.

export const fetchPosts = createServerFn({ method: 'GET' }).handler(() => getPosts().map((post) => ({ ...post, paragraphs: [] })));

export const fetchPost = createServerFn({ method: 'GET' })
    .validator((slug: string) => slug)
    .handler((context) => getPost(context.data) ?? null);

export const fetchProducts = createServerFn({ method: 'GET' })
    .validator((query: ProductQuery) => query)
    .handler((context) => listProducts(context.data));

export const fetchProduct = createServerFn({ method: 'GET' })
    .validator((id: string) => id)
    .handler((context) => getProduct(context.data) ?? null);

export const fetchMetricRows = createServerFn({ method: 'GET' }).handler(() => getMetricRows());

export const createReview = createServerFn({ method: 'POST' })
    .validator((formData: FormData) => ({
        productId: String(formData.get('productId') ?? ''),
        author: String(formData.get('author') ?? ''),
        rating: Number(formData.get('rating') ?? 5),
        text: String(formData.get('text') ?? ''),
    }))
    .handler((context) => addReview(context.data));

export const parseProductSearch = (search: Record<string, unknown>): ProductQuery => ({
    q: typeof search['q'] === 'string' && search['q'] !== '' ? search['q'] : undefined,
    category: parseCategory(search['category']),
    sort: parseSort(search['sort']),
    page: parsePage(search['page']),
});
