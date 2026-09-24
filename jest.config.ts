import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
}

export default async () => {
  const jestConfig = await createJestConfig(config)()

  // next/jest sets up default transformIgnorePatterns, including /node_modules/
  // We need to override that to allow next-intl and use-intl to be transformed
  const transformIgnorePatterns = jestConfig.transformIgnorePatterns || []
  // Replace /node_modules/ pattern with our custom pattern that excludes next-intl and use-intl
  const updatedPatterns = transformIgnorePatterns.map((pattern: string) =>
    pattern === '/node_modules/' ? '/node_modules/(?!(next-intl|use-intl))/' : pattern
  )

  return {
    ...jestConfig,
    transformIgnorePatterns: updatedPatterns,
    // .worktrees/ (git-ignored, see using-git-worktrees) sits inside the repo
    // root — without this, Jest also discovers and runs the copies of every
    // test file nested inside any active worktree.
    testPathIgnorePatterns: [...(jestConfig.testPathIgnorePatterns || []), '<rootDir>/.worktrees/', '<rootDir>/worktrees/'],
  }
}
