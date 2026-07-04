import tseslint from 'typescript-eslint';

export default tseslint.config(
    ...tseslint.configs.recommended,
    {
        files: ['src/**/*.ts'],
        rules: {
            // Codebase predates linting; keep signal high and churn low.
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
            'no-console': 'off',
            eqeqeq: ['error', 'smart'],
            curly: ['error', 'multi-line'],
        },
    },
    {
        ignores: ['out/**', 'dist/**', 'node_modules/**', 'media/**', 'plugins/**', 'scripts/**', 'esbuild.js'],
    }
);
