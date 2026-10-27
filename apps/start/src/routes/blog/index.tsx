import { PostList } from '@bench/ui';
import { AppLink } from '@components/AppLink';
import { fetchPosts } from '@server/data';
import { createFileRoute } from '@tanstack/react-router';

const BlogPage = () => (
    <PostList
        posts={Route.useLoaderData()}
        Link={AppLink}
    />
);

export const Route = createFileRoute('/blog/')({
    loader: () => fetchPosts(),
    component: BlogPage,
});
