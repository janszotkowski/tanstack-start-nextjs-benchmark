import { capitalize, createRandom, words } from './random.ts';

export const CATEGORIES = ['audio', 'cameras', 'computers', 'gaming', 'home', 'outdoor', 'phones', 'wearables'] as const;
export type Category = (typeof CATEGORIES)[number];

export const SORTS = ['relevance', 'price-asc', 'price-desc', 'rating'] as const;
export type Sort = (typeof SORTS)[number];

export type Review = {
    id: string;
    author: string;
    rating: number;
    text: string;
};

export type Product = {
    id: string;
    name: string;
    category: Category;
    price: number;
    rating: number;
    stock: number;
    description: string;
    reviews: Review[];
};

export type ProductQuery = {
    q?: string | undefined;
    category?: Category | undefined;
    sort?: Sort | undefined;
    page?: number | undefined;
};

export type ProductPage = {
    items: Product[];
    total: number;
    page: number;
    pageCount: number;
};

export const PRODUCT_COUNT = 1000;
export const PAGE_SIZE = 24;

const random = createRandom(2);

const PRODUCTS: Product[] = Array.from({ length: PRODUCT_COUNT }, (_, index) => ({
    id: String(index + 1),
    name: capitalize(words(random, random.int(2, 4))),
    category: random.pick(CATEGORIES),
    price: random.int(500, 250_000) / 100,
    rating: random.int(10, 50) / 10,
    stock: random.int(0, 500),
    description: `${capitalize(words(random, random.int(60, 120)))}.`,
    reviews: Array.from({ length: random.int(0, 6) }, (_, reviewIndex) => ({
        id: `${index + 1}-${reviewIndex + 1}`,
        author: capitalize(words(random, 2)),
        rating: random.int(1, 5),
        text: `${capitalize(words(random, random.int(10, 40)))}.`,
    })),
}));

const compare: Record<Sort, (a: Product, b: Product) => number> = {
    relevance: () => 0,
    'price-asc': (a, b) => a.price - b.price,
    'price-desc': (a, b) => b.price - a.price,
    rating: (a, b) => b.rating - a.rating,
};

export const listProducts = (query: ProductQuery): ProductPage => {
    const q = query.q?.trim().toLowerCase() ?? '';
    const matches = PRODUCTS.filter((product) => (query.category === undefined || product.category === query.category) && (q === '' || product.name.toLowerCase().includes(q)));
    const sorted = [...matches].sort(compare[query.sort ?? 'relevance']);
    const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    const page = Math.min(Math.max(1, query.page ?? 1), pageCount);
    return { items: sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total: sorted.length, page, pageCount };
};

export const getProduct = (id: string): Product | undefined => PRODUCTS.find((product) => product.id === id);

export type SearchHit = Pick<Product, 'id' | 'name' | 'category' | 'price'>;

/** The `/api/search` endpoint: the first 10 names containing the query. */
export const searchProducts = (q: string): SearchHit[] => {
    const needle = q.trim().toLowerCase();
    if (needle === '') return [];
    return PRODUCTS.filter((product) => product.name.toLowerCase().includes(needle))
        .slice(0, 10)
        .map((product) => ({ id: product.id, name: product.name, category: product.category, price: product.price }));
};

export type NewReview = {
    productId: string;
    author: string;
    rating: number;
    text: string;
};

/**
 * The mutation both apps run. It lives in process memory, so a restart forgets it; that is fine for a benchmark
 * and keeps a database out of the measurement.
 */
export const addReview = (input: NewReview): Review => {
    const product = getProduct(input.productId);
    if (product === undefined) throw new Error(`Product ${input.productId} does not exist`);
    const author = input.author.trim().slice(0, 60);
    const text = input.text.trim().slice(0, 1000);
    if (author === '' || text === '') throw new Error('Author and text are required');
    const review: Review = { id: `${product.id}-${product.reviews.length + 1}`, author, rating: Math.min(5, Math.max(1, Math.round(input.rating))), text };
    product.reviews.push(review);
    return review;
};

export const parseCategory = (value: unknown): Category | undefined => ((CATEGORIES as readonly unknown[]).includes(value) ? (value as Category) : undefined);

export const parseSort = (value: unknown): Sort | undefined => ((SORTS as readonly unknown[]).includes(value) ? (value as Sort) : undefined);

export const parsePage = (value: unknown): number | undefined => {
    const page = Number(value);
    return Number.isInteger(page) && page > 0 ? page : undefined;
};
