import { z } from 'zod'

export const KirbyThemeSchema = z.object({
  colors: z.object({
    pink: z.string().regex(/^#[0-9A-F]{6}$/i),
    blue: z.string().regex(/^#[0-9A-F]{6}$/i),
    purple: z.string().regex(/^#[0-9A-F]{6}$/i),
    peach: z.string().regex(/^#[0-9A-F]{6}$/i),
    mint: z.string().regex(/^#[0-9A-F]{6}$/i),
  }),
  borderRadius: z.object({
    sm: z.string().regex(/^\d+(\.\d+)?(px|rem)$/), // e.g., "16px"
    default: z.string().regex(/^\d+(\.\d+)?(px|rem)$/), // e.g., "24px"
    full: z.literal('9999px'),
  }),
  animations: z.object({
    durationFast: z.number().positive(), // milliseconds
    durationNormal: z.number().positive(),
    durationSlow: z.number().positive(),
    easingBounce: z.string(), // e.g., "cubic-bezier(0.68, -0.55, 0.265, 1.55)"
  }),
})

export type KirbyTheme = z.infer<typeof KirbyThemeSchema>

export const KIRBY_THEME: KirbyTheme = {
  colors: {
    pink: '#FDA4AF',
    blue: '#93C5FD',
    purple: '#C4B5FD',
    peach: '#FDBA8C',
    mint: '#A7F3D0',
  },
  borderRadius: {
    sm: '16px',
    default: '24px',
    full: '9999px',
  },
  animations: {
    durationFast: 200,
    durationNormal: 400,
    durationSlow: 600,
    easingBounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
} as const
