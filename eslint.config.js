import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'

/**
 * Reglas de calidad del proyecto.
 *
 * El objetivo no es imponer un estilo — de eso se ocupa Prettier — sino
 * cazar lo que de verdad rompe cosas: dependencias mal declaradas en los
 * hooks, variables sin usar que delatan código muerto y promesas sin
 * esperar, que en una aplicación que guarda dinero son un fallo silencioso.
 */
export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.es2021 }
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // Lo que sí queremos que falle.
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrors: 'none'
      }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',
      'no-var': 'error'
    }
  },

  // En las pruebas sobran algunas rigideces: usan `any` para forzar casos
  // imposibles a propósito y globales del entorno de vitest.
  {
    files: ['**/*.test.{ts,tsx}'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' }
  },

  // Node, no navegador.
  {
    files: ['server.mjs', '*.config.{js,ts}'],
    languageOptions: { globals: { ...globals.node } }
  },

  // El trabajador de servicio corre en su propio contexto: ni window ni Node.
  {
    files: ['public/sw.js'],
    languageOptions: { globals: { ...globals.serviceworker } }
  }
)
