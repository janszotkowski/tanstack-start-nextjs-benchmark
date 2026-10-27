import { Page, ProductDetail, ReviewFields, ReviewList } from '@bench/ui';
import { createReview, fetchProduct } from '@server/data';
import { createFileRoute, notFound, useRouter } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useState, type FormEvent } from 'react';

const ProductPage = () => {
    const product = Route.useLoaderData();
    const router = useRouter();
    const submitReview = useServerFn(createReview);
    const [pending, setPending] = useState(false);

    const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = event.currentTarget;
        setPending(true);
        await submitReview({ data: new FormData(form) });
        await router.invalidate();
        form.reset();
        setPending(false);
    };

    return (
        <Page title={product.name}>
            <ProductDetail product={product} />
            <ReviewList product={product} />
            <form onSubmit={onSubmit}>
                <input
                    type={'hidden'}
                    name={'productId'}
                    value={product.id}
                />
                <ReviewFields disabled={pending} />
            </form>
        </Page>
    );
};

export const Route = createFileRoute('/products/$id')({
    loader: async (context) => {
        const product = await fetchProduct({ data: context.params.id });
        if (product === null) throw notFound();
        return product;
    },
    head: (context) => ({ meta: [{ title: `${context.loaderData?.name ?? 'Not found'} · Bench · TanStack Start` }] }),
    component: ProductPage,
});
