import type { Post } from '@bench/data';
import { Page } from './Page.tsx';
import type { LinkComponent } from './link.ts';

export type PostListProps = {
    posts: Post[];
    Link: LinkComponent;
};

export const PostList = (props: PostListProps) => {
    const Link = props.Link;
    return (
        <Page title={'Blog'}>
            <ul className={'divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800'}>
                {props.posts.map((post) => (
                    <li
                        key={post.slug}
                        className={'py-4'}
                    >
                        <Link
                            href={`/blog/${post.slug}`}
                            className={'font-medium'}
                        >
                            {post.title}
                        </Link>
                        <p className={'mt-1 font-mono text-xs text-neutral-500'}>
                            {post.published} · {post.readingMinutes} min
                        </p>
                    </li>
                ))}
            </ul>
        </Page>
    );
};

export type PostArticleProps = {
    post: Post;
};

export const PostArticle = (props: PostArticleProps) => (
    <main className={'mx-auto max-w-2xl px-4 py-10'}>
        <p className={'font-mono text-xs text-neutral-500'}>
            {props.post.published} · {props.post.readingMinutes} min
        </p>
        <h1 className={'mt-2 text-3xl font-semibold tracking-tight'}>{props.post.title}</h1>
        <div className={'mt-8 space-y-5 leading-7'}>
            {props.post.paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
            ))}
        </div>
    </main>
);
