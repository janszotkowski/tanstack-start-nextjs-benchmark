/** A seeded PRNG (mulberry32): every process, every build and both apps see the same data. */
export const createRandom = (seed: number) => {
    let state = seed >>> 0;
    const next = (): number => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const int = (min: number, max: number): number => min + Math.floor(next() * (max - min + 1));
    const pick = <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)] as T;
    return { next, int, pick };
};

const WORDS =
    'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum'.split(
        ' ',
    );

export const words = (random: ReturnType<typeof createRandom>, count: number): string => Array.from({ length: count }, () => random.pick(WORDS)).join(' ');

export const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);
