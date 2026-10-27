import { defineConfig } from 'oxlint';

export default defineConfig({
    ignorePatterns: ['dist', '.output', '.next', 'node_modules', '.tanstack', '.turbo', '**/routeTree.gen.ts', '**/next-env.d.ts', 'results'],
    plugins: ['import', 'unicorn', 'typescript'],
    categories: {
        correctness: 'warn',
    },
    rules: {
        'eslint/no-unused-vars': 'error',
        '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
        '@typescript-eslint/no-unused-vars': 'error',
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-empty-object-type': 'error',
        // Every function is a const: `export const getPost = () => {}`, never `export function getPost() {}`.
        'eslint/func-style': ['error', 'expression'],
        // Imports use the path aliases of the app (@components/…, @lib/…): no `../` and no `./folder/…`.
        'eslint/no-restricted-imports': [
            'error',
            { patterns: [{ group: ['../**', './*/**'], message: 'Use a path alias (@components/…, @lib/…). Only same-folder siblings (./name) may be relative.' }] },
        ],
    },
    overrides: [
        {
            // The benchmark scripts are plain Node and print their progress.
            files: ['scripts/**', 'tools/**'],
            rules: { 'eslint/no-console': 'off', 'eslint/no-restricted-imports': 'off' },
        },
        {
            // Code that runs before aliases exist, and Next's own route files, whose names Next decides.
            files: ['**/vite.config.ts', '**/next.config.ts', 'apps/next/src/app/**'],
            rules: { 'eslint/func-style': 'off', 'eslint/no-restricted-imports': 'off' },
        },
        {
            files: ['apps/**/*.tsx', 'packages/ui/**/*.tsx'],
            plugins: ['react', 'jsx-a11y'],
            jsPlugins: ['./tools/oxlint-plugin.js'],
            rules: {
                'bench/no-destructured-component-props': 'error',
                'bench/no-inline-component-props-type': 'error',
                'react/jsx-curly-brace-presence': ['error', { props: 'always', children: 'never' }],
            },
        },
    ],
});
