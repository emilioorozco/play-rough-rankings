import { FlatCompat } from '@eslint/eslintrc'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      '.vercel/**',
      'out/**',
      'design-drafts/**',
      'scripts/**',
      'docs/**',
      'generated/**',
      'coverage/**',
      '__tests__/**',
      '*.config.js',
      '*.setup.js',
      'jest.global-*.js',
      '*.d.ts',
      '.env*',
      'package-lock.json',
      'tsconfig.tsbuildinfo'
    ]
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ]
    }
  }
]

export default eslintConfig
