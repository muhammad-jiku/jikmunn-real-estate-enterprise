import nextPlugin from '@next/eslint-plugin-next';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import reactPlugin from 'eslint-plugin-react';
import hooksPlugin from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

const __dirname = decodeURIComponent(
  new URL('.', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')
);

export default tseslint.config(
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'src/types/prismaTypes.d.ts',
      'src/components/ui/**',
      '**/*.d.ts',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    plugins: {
      '@next/next': nextPlugin,
      react: reactPlugin,
      'react-hooks': hooksPlugin,
      'jsx-a11y': jsxA11yPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      ...reactPlugin.configs.recommended.rules,
      ...hooksPlugin.configs.recommended.rules,
      ...jsxA11yPlugin.flatConfigs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/purity': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
  },
  ...tseslint.configs.recommended
);
