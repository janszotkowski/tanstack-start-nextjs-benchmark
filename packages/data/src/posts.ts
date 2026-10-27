import { capitalize, createRandom, words } from './random.ts';

export type Post = {
    slug: string;
    title: string;
    excerpt: string;
    published: string;
    readingMinutes: number;
    paragraphs: string[];
};

export const POST_COUNT = 200;

const random = createRandom(1);

const POSTS: Post[] = Array.from({ length: POST_COUNT }, (_, index) => {
    const title = capitalize(words(random, random.int(4, 9)));
    const paragraphs = Array.from({ length: random.int(8, 16) }, () => `${capitalize(words(random, random.int(40, 90)))}.`);
    const wordCount = paragraphs.join(' ').split(' ').length;
    const day = new Date(Date.UTC(2026, 0, 1) + index * 86_400_000);
    return {
        slug: `post-${index + 1}`,
        title,
        excerpt: `${paragraphs[0]?.slice(0, 160)}…`,
        published: day.toISOString().slice(0, 10),
        readingMinutes: Math.max(1, Math.round(wordCount / 220)),
        paragraphs,
    };
});

export const getPosts = (): Post[] => POSTS;

export const getPost = (slug: string): Post | undefined => POSTS.find((post) => post.slug === slug);
