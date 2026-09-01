import js from '@eslint/js'

export default [
  {
    ignores: ['browser.js', 'coverage/**', 'node_modules/**', 'release-candidate/**']
  },
  js.configs.recommended,
  {
    files: ['ndarray-ops.js', 'scripts/**/*.cjs', 'test/**/*.cjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        Buffer: 'readonly',
        __dirname: 'readonly',
        clearTimeout: 'readonly',
        console: 'readonly',
        define: 'readonly',
        module: 'readonly',
        process: 'readonly',
        require: 'readonly',
        self: 'readonly',
        setTimeout: 'readonly',
        URL: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['error', { caughtErrorsIgnorePattern: '^_$' }]
    }
  },
  {
    files: ['ndarray-ops.js'],
    rules: {
      'no-redeclare': 'off'
    }
  },
  {
    files: ['**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        Buffer: 'readonly',
        clearTimeout: 'readonly',
        console: 'readonly',
        process: 'readonly',
        setTimeout: 'readonly',
        URL: 'readonly'
      }
    }
  },
  {
    files: ['examples/**/*.cjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
        require: 'readonly'
      }
    }
  },
  {
    files: ['docs-site/app.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        document: 'readonly',
        navigator: 'readonly',
        window: 'readonly'
      }
    }
  },
  {
    rules: {
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error'
    }
  }
]
