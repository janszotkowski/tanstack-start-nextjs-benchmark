import { PostArticle } from '@bench/ui';
import { fetchPost } from '@server/data';
import { createFileRoute, notFound } from '@tanstack/react-router';

const PostPage = () => <PostArticle post={Route.useLoaderData()} />;

export const Route = createFileRoute('/blog/$slug')({
    loader: async (context) => {
        const post = await fetchPost({ data: context.params.slug });
        if (post === null) throw notFound();
        return post;
    },
    head: (context) => ({ meta: [{ title: `${context.loaderData?.title ?? 'Not found'} · Bench · TanStack Start` }] }),
    component: PostPage,
});
