import { getPosts } from '@bench/data';
import { PostList } from '@bench/ui';
import { AppLink } from '@components/AppLink';

export default function BlogPage() {
    return (
        <PostList
            posts={getPosts()}
            Link={AppLink}
        />
    );
}
