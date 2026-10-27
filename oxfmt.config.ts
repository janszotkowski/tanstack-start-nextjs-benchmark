import { defineConfig } from 'oxfmt';

export default defineConfig({
    printWidth: 200,
    singleQuote: true,
    trailingComma: 'all',
    arrowParens: 'always',
    bracketSpacing: true,
    bracketSameLine: false,
    tabWidth: 4,
    singleAttributePerLine: true,
    ignorePatterns: ['dist', '.output', '.next', 'node_modules', '.tanstack', '.turbo', '**/routeTree.gen.ts', '**/next-env.d.ts', 'pnpm-lock.yaml', 'results'],
});
