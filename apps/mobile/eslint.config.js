const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // npm hoists the web workspace's TS 7 resolver; mobile resolution is
      // verified by tsc and Metro instead of the incompatible import plugin.
      'import/namespace': 'off',
      'import/no-unresolved': 'off',
      'import/no-duplicates': 'off',
      // Screens load remote state on mount/focus; the async callbacks do not
      // cause the synchronous cascading-render pattern this rule targets.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: ['scripts/*.cjs'],
    languageOptions: {
      globals: { __dirname: 'readonly', require: 'readonly', module: 'readonly' },
    },
  },
  { ignores: ['.expo/**', 'dist/**'] },
]);
