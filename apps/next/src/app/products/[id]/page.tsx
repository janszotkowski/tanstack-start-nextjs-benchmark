import { getProduct } from '@bench/data';
import { Page, ProductDetail, ReviewFields, ReviewList } from '@bench/ui';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { createReview } from './actions';

export const generateMetadata = async (props: PageProps<'/products/[id]'>): Promise<Metadata> => {
    const product = getProduct((await props.params).id);
    return { title: product === undefined ? 'Not found' : `${product.name} · Bench · Next.js` };
};

export default async function ProductPage(props: PageProps<'/products/[id]'>) {
    // Server rendered on every request, like the Start app: the reviews change at runtime.
    await connection();
    const product = getProduct((await props.params).id);
    if (product === undefined) notFound();
    return (
        <Page title={product.name}>
            <ProductDetail product={product} />
            <ReviewList product={product} />
            <form action={createReview.bind(null, product.id)}>
                <ReviewFields />
            </form>
        </Page>
    );
}
