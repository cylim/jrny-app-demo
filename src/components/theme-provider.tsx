'use client'

import type { ThemeProviderProps } from 'next-themes'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

/**
 * Wraps the next-themes ThemeProvider and supplies theme context to its children.
 *
 * @param children - React nodes rendered inside the provider
 * @param props - All `ThemeProviderProps` are forwarded to the underlying provider
 * @returns The provider element that provides theme context to descendant components
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
