const url = `file://${__dirname}/packages/configuration/paths.ts`

const configureMetaUrl = {
  diagnostics: { ignoreCodes: [1343] },
  astTransformers: {
    before: [
      {
        path: 'ts-jest-mock-import-meta',
        options: { metaObjectReplacement: { url } },
      },
    ],
  },
}

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  // preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    // https://www.npmjs.com/package/ts-jest-mock-import-meta
    '^.+\\.tsx?$': ['ts-jest', { ...configureMetaUrl, useESM: true }],
    // https://stackoverflow.com/a/61785012
    'node_modules/chalk/.+\\.(j|t)sx?$': 'ts-jest',
  },
  transformIgnorePatterns: ['node_modules/(?!chalk)'],
  extensionsToTreatAsEsm: ['.ts'],
  // exclude node_modules and dist folder from tests
  modulePathIgnorePatterns: ['<rootDir>/.*/node_modules/', '<rootDir>/.*/dist/'],
  // code coverage reports
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage/',
  coverageReporters: ['json', 'lcov', 'text', 'clover', 'html'],
}
