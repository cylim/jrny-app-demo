/**
 * Footer component with copyright and social links
 * Appears below the min-h-screen content, only visible when scrolling to bottom
 */
export function Footer() {
  return (
    <footer className="relative w-full bg-gradient-to-b from-lime-100 to-green-200 dark:bg-gradient-to-b dark:from-emerald-950 dark:to-green-950 pb-6 pt-6">
      {/* Footer content */}
      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-center gap-4 text-center text-sm sm:flex-row sm:justify-between">
          <p className="text-green-900 dark:text-green-200">
            &copy; {new Date().getFullYear()} JRNY. All rights reserved.
          </p>
          <a
            href="https://x.com/issahayashi"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-800 transition-colors hover:text-green-950 dark:text-green-300 dark:hover:text-white"
          >
            Follow on X
          </a>
        </div>
      </div>
    </footer>
  )
}
