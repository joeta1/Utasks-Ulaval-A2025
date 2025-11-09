import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import pluginVitest from '@vitest/eslint-plugin'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'
import globals from 'globals'
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'

export default [
  {
    name: 'app/files-to-lint',
    files: ['**/*.{js,mjs,jsx,vue}'],
  },

  {
    name: 'app/files-to-ignore',
    ignores: ['**/dist/**', '**/dist-ssr/**', '**/coverage/**'],
  },

  js.configs.recommended,
  ...pluginVue.configs['flat/essential'],

//--- TypeScript Support ------
  {
    name: 'app/typescript-support',
    files: ['**/*.{ts,tsx,vue}'],
    languageOptions: {
      parser: 'vue-eslint-parser',
      parserOptions: {
        parser: tsParser,
        ecmaVersion: 2020,
        sourceType: 'module',
        extraFileExtensions: ['.vue'],
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
    },
  },

  //---------------------------------
  {
    ...pluginVitest.configs.recommended,
    files: ['src/**/__tests__/*'],
  },

  skipFormatting,
  {
    languageOptions: {
      globals: {
        ...globals.node
      }
    },
    rules: {
      "no-console": process.env.NODE_ENV === "production" ? "error" : "off",
      "no-debugger": process.env.NODE_ENV === "production" ? "error" : "off",
      "vue/multi-word-component-names": 0,
    },

  }
]