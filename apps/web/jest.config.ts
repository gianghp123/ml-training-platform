import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@training-ml/pipeline-engine$': '<rootDir>/../../packages/pipeline-engine/src/index.ts',
    '^@training-ml/contracts$': '<rootDir>/../../packages/contracts/src/index.ts',
  },
};

export default config;
