import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Compose multiple class name inputs into a single string and merge Tailwind CSS utility conflicts.
 *
 * @param inputs - Class values (strings, arrays, objects, etc.) to combine into the resulting class string
 * @returns The combined class string with Tailwind utility classes merged to resolve conflicts
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}