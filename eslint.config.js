import js from '@eslint/js';
import globals from 'globals';
import hooks from 'eslint-plugin-react-hooks';

export default [
  { ignores: ['dist/**', '.server/**', 'node_modules/**', 'docs/**', 'public/**'] },
  js.configs.recommended,
  { files: ['**/*.{js,jsx,mjs}'], languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.node, ...globals.browser }, parserOptions: { ecmaFeatures: { jsx: true } } }, rules: { 'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z]', argsIgnorePattern: '^_' }] } },
  { files: ['src/**/*.{jsx,js}'], plugins: { 'react-hooks': hooks }, rules: hooks.configs.recommended.rules },
];