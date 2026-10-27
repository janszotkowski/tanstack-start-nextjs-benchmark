import { CATEGORIES, SORTS, type Product, type ProductPage, type ProductQuery } from '@bench/data';
import { buttonClass, formatPrice, inputClass, linkClass } from './classes.ts';
import type { LinkComponent } from './link.ts';

export type ProductFiltersProps = {
    query: ProductQuery;
};

/** A plain GET form: it works without JavaScript and behaves the same in both apps. */
export const ProductFilters = (props: ProductFiltersProps) => (
    <form
        method={'get'}
        action={'/products'}
        className={'grid gap-3 sm:grid-cols-[1fr_12rem_12rem_auto]'}
    >
        <input
            name={'q'}
            defaultValue={props.query.q ?? ''}
            placeholder={'Search products'}
            aria-label={'Search products'}
            className={inputClass}
        />
        <select
            name={'category'}
            defaultValue={props.query.category ?? ''}
            aria-label={'Category'}
            className={inputClass}
        >
            <option value={''}>All categories</option>
            {CATEGORIES.map((category) => (
                <option
                    key={category}
                    value={category}
                >
                    {category}
                </option>
            ))}
        </select>
        <select
            name={'sort'}
            defaultValue={props.query.sort ?? 'relevance'}
            aria-label={'Sort'}
            className={inputClass}
        >
            {SORTS.map((sort) => (
                <option
                    key={sort}
                    value={sort}
                >
                    {sort}
                </option>
            ))}
        </select>
        <button
            type={'submit'}
            className={buttonClass}
        >
            Filter
        </button>
    </form>
);

export type ProductGridProps = {
    result: ProductPage;
    query: ProductQuery;
    Link: LinkComponent;
};

/** Builds a `/products` address that keeps the current filters and changes the page. */
export const productsHref = (query: ProductQuery, page: number): string => {
    const params = new URLSearchParams();
    if (query.q) params.set('q', query.q);
    if (query.category) params.set('category', query.category);
    if (query.sort) params.set('sort', query.sort);
    if (page > 1) params.set('page', String(page));
    const search = params.toString();
    return search === '' ? '/products' : `/products?${search}`;
};

export const ProductGrid = (props: ProductGridProps) => {
    const Link = props.Link;
    return (
        <div>
            <p className={'font-mono text-xs text-neutral-500'}>
                {props.result.total} products · page {props.result.page} of {props.result.pageCount}
            </p>
            <ul className={'mt-3 grid border-t border-l border-neutral-200 sm:grid-cols-2 lg:grid-cols-3 dark:border-neutral-800'}>
                {props.result.items.map((product) => (
                    <li
                        key={product.id}
                        className={'border-r border-b border-neutral-200 p-4 dark:border-neutral-800'}
                    >
                        <Link
                            href={`/products/${product.id}`}
                            className={'font-medium'}
                        >
                            {product.name}
                        </Link>
                        <p className={'mt-1 text-sm text-neutral-600 dark:text-neutral-400'}>
                            {product.category} · ★ {product.rating.toFixed(1)}
                        </p>
                        <p className={'mt-2 font-mono text-sm'}>{formatPrice(product.price)}</p>
                    </li>
                ))}
            </ul>
            <nav className={'mt-6 flex justify-between text-sm'}>
                {props.result.page > 1 ? (
                    <Link
                        href={productsHref(props.query, props.result.page - 1)}
                        className={linkClass}
                    >
                        ← Previous
                    </Link>
                ) : (
                    <span />
                )}
                {props.result.page < props.result.pageCount ? (
                    <Link
                        href={productsHref(props.query, props.result.page + 1)}
                        className={linkClass}
                    >
                        Next →
                    </Link>
                ) : null}
            </nav>
        </div>
    );
};

export type ProductDetailProps = {
    product: Product;
};

export const ProductDetail = (props: ProductDetailProps) => (
    <div className={'grid gap-10 md:grid-cols-[1fr_20rem]'}>
        <div>
            <p className={'font-mono text-xs text-neutral-500'}>
                {props.product.category} · ★ {props.product.rating.toFixed(1)} · {props.product.stock} in stock
            </p>
            <p className={'mt-4 leading-7'}>{props.product.description}</p>
        </div>
        <p className={'font-mono text-2xl'}>{formatPrice(props.product.price)}</p>
    </div>
);

export type ReviewListProps = {
    product: Product;
};

export const ReviewList = (props: ReviewListProps) => (
    <section className={'mt-10'}>
        <h2 className={'text-lg font-semibold'}>{`Reviews (${props.product.reviews.length})`}</h2>
        <ul className={'mt-3 divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800'}>
            {props.product.reviews.map((review) => (
                <li
                    key={review.id}
                    className={'py-3'}
                >
                    <p className={'text-sm font-medium'}>
                        {review.author} <span className={'font-mono text-xs text-neutral-500'}>{'★'.repeat(review.rating)}</span>
                    </p>
                    <p className={'mt-1 text-sm text-neutral-600 dark:text-neutral-400'}>{review.text}</p>
                </li>
            ))}
        </ul>
    </section>
);

export type ReviewFieldsProps = {
    disabled?: boolean;
};

/** The fields of the review form. Each app wraps them in its own form (server action vs server function). */
export const ReviewFields = (props: ReviewFieldsProps) => (
    <div className={'mt-6 grid gap-3 sm:grid-cols-[12rem_6rem_1fr_auto]'}>
        <input
            name={'author'}
            required
            placeholder={'Your name'}
            aria-label={'Your name'}
            className={inputClass}
        />
        <select
            name={'rating'}
            defaultValue={'5'}
            aria-label={'Rating'}
            className={inputClass}
        >
            {[5, 4, 3, 2, 1].map((rating) => (
                <option
                    key={rating}
                    value={rating}
                >
                    {`${rating} ★`}
                </option>
            ))}
        </select>
        <input
            name={'text'}
            required
            placeholder={'What do you think?'}
            aria-label={'Review'}
            className={inputClass}
        />
        <button
            type={'submit'}
            disabled={props.disabled}
            className={buttonClass}
        >
            Add review
        </button>
    </div>
);
