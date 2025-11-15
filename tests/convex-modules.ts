/**
 * Convex function modules for testing
 *
 * This file uses Vite's import.meta.glob to import all Convex function files
 * for use with convex-test. The glob pattern matches all TypeScript files
 * in the convex directory.
 */

export const modules = import.meta.glob('../convex/**/*.ts')
