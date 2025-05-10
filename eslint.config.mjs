import eslint from '@eslint/js'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import prettierPlugin from 'eslint-plugin-prettier'
import prettierConfig from 'eslint-config-prettier'
import globalsPackage from 'globals'

const { node, es2021, mocha } = globalsPackage

// Shared base configuration for all TypeScript files
const typescriptConfig = {
  files: ['src/**/*.ts'],
  plugins: {
    '@typescript-eslint': tseslint,
    'prettier': prettierPlugin
  },
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      project: './tsconfig.json',
      ecmaVersion: 2021,
      sourceType: 'module' // This is correct for your TS source files
    }
  },
  rules: {
    ...tseslint.configs.recommended.rules,
    ...tseslint.configs['recommended-requiring-type-checking'].rules,
    'prettier/prettier': ['error', {
      singleQuote: true,
      semi: false,
      trailingComma: 'none',
      printWidth: 100,
      endOfLine: 'auto'
    }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-require-imports': 'error',
    '@typescript-eslint/no-var-requires': 'error'
  }
}

export default [
  eslint.configs.recommended, // For .js files, including this config file

  // Library configuration
  {
    ...typescriptConfig,
    ignores: ['src/cli/**/*'], // Ignore CLI files for library-specific rules
    languageOptions: {
      ...typescriptConfig.languageOptions,
      globals: {
        ...es2021 // ES2021 globals for library code
      }
    },
    rules: {
      ...typescriptConfig.rules,
      'no-console': 'error' // Disallow console logs in library code
    }
  },

  // CLI-specific configuration
  {
    ...typescriptConfig,
    files: ['src/cli/**/*.ts'], // Target only CLI files
    languageOptions: {
      ...typescriptConfig.languageOptions,
      globals: {
        ...node,    // Node.js globals for CLI
        ...es2021   // ES2021 globals
      }
    },
    rules: {
      ...typescriptConfig.rules,
      'no-console': 'off' // Allow console logs in CLI
    }
  },

  // Test files configuration (Mocha + Sinon)
  {
    ...typescriptConfig,
    files: ['**/*.test.ts', '**/*.spec.ts'], // Target test files
    languageOptions: {
      ...typescriptConfig.languageOptions,
      globals: {
        ...mocha,  // Mocha globals (describe, it, etc.)
        sinon: 'readonly',  // Sinon global
        ...node,   // Node.js globals (often useful in tests)
        ...es2021  // ES2021 globals
      }
    },
    rules: {
      ...typescriptConfig.rules,
      'no-console': 'off', // Allow console logs in tests
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-unused-expressions': 'off',  // Allows chai expect expressions
      '@typescript-eslint/no-unused-expressions': 'off'  // Allows chai expect expressions with TS plugin
    }
  },

  // Global ignores for the entire project
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '**/*.d.ts',
      'coverage/**',
      'examples/**',
      '*.config.js'
    ]
  },

  prettierConfig // Must be last to override other formatting rules
]
