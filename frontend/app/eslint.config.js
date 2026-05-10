import love from 'eslint-config-love';
import pluginJsxA11y from 'eslint-plugin-jsx-a11y';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginStorybook from 'eslint-plugin-storybook';

export default [
  {
    ignores: ['public/**', 'dist/**'],
  },
  love,
  {
    files: ['**/*.{ts,tsx}'],
    ...pluginReact.configs.flat.recommended,
  },
  {
    files: ['**/*.{ts,tsx}'],
    ...pluginReact.configs.flat['jsx-runtime'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': pluginReactHooks,
      'jsx-a11y': pluginJsxA11y,
    },
    rules: {
      ...pluginReactHooks.configs.recommended.rules,
      'jsx-a11y/label-has-associated-control': ['error', { assert: 'either' }],
    },
  },
  ...pluginStorybook.configs['flat/recommended'],
  {
    files: ['**/*.{ts,tsx}'],
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // Relax some rules from eslint-config-love for this project
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
      'complexity': [
        'warn',
        { "maximum": 10 }
      ],
      '@typescript-eslint/no-magic-numbers': ["error", { "ignore": [0, 1, -1] }],
      "@typescript-eslint/prefer-destructuring": ["error", {
        "array": false,
        "object": true
      }],
    },
  }
];
