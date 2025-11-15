import { Link } from '@tanstack/react-router'
import { UserNav } from '~/components/auth/user-nav'
import { ModeToggle } from '~/components/mode-toggle'

/**
 * Site header component with centered navigation
 * Features sticky positioning, blur backdrop, and responsive layout
 *
 * @returns Header element with logo, theme toggle, and user navigation
 */
export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <span className="font-bold">JRNY</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-2">
          <ModeToggle />
          <UserNav />
        </nav>
      </div>
    </header>
  )
}
