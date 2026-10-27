import { getPost, getPosts } from '@bench/data';
import { PostArticle } from '@bench/ui';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

// All 200 posts are prerendered at build time; any other slug is a 404 without rendering.
export const dynamicParams = false;

export const generateStaticParams = () => getPosts().map((post) => ({ slug: post.slug }));

export const generateMetadata = async (props: PageProps<'/blog/[slug]'>): Promise<Metadata> => {
    const post = getPost((await props.params).slug);
    return { title: post === undefined ? 'Not found' : `${post.title} · Bench · Next.js` };
};

export default async function PostPage(props: PageProps<'/blog/[slug]'>) {
    const post = getPost((await props.params).slug);
    if (post === undefined) notFound();
    return <PostArticle post={post} />;
}
