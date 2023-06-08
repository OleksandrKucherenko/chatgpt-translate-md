module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
  },
  plugins: ['prettier'],
  parser: '@typescript-eslint/parser',
  extends: ['standard-with-typescript', 'prettier'],
  overrides: [],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    // https://typescript-eslint.io/linting/typed-linting/monorepos/
    project: ['./packages/*/tsconfig*.json', './clis/*/tsconfig*.json', './tsconfig*.json'],
  },
  ignorePatterns: [
    'node_modules',
    'dist',
    'coverage',
    'build',
    'docs',
    'reports',
    '.scripts',
    '.secrets',
    '.yarn',
    '.cache',
    '.pnp.*',
    '.eslintrc.cjs',
    'jest.config.js',
  ],
  rules: {
    'prettier/prettier': 'error',
    quotes: ['error', 'backtick', { avoidEscape: true, allowTemplateLiterals: true }],
    /* express 5 support promises */
    '@typescript-eslint/no-misused-promises': 'off',
    /* unused variables is not an issue, only warning */
    '@typescript-eslint/no-unused-vars': 'warn',
    /* allow any in template strings */
    '@typescript-eslint/restrict-template-expressions': ['warn', { allowAny: true, allowNever: true }],
  },
}
