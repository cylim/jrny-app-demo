export function TechStack() {
  const technologies = [
    {
      name: 'TanStack',
      logoLight: 'https://tanstack.com/images/logos/logo-black.svg',
      logoDark: 'https://tanstack.com/images/logos/logo-white.svg',
      url: 'https://tanstack.com',
    },
    {
      name: 'Convex',
      logo: '/logos/convex.svg',
      url: 'https://convex.dev',
      wideLayout: true,
      invertInDark: true,
    },
    {
      name: 'Cloudflare',
      logoLight: 'https://www.cloudflare.com/img/logo-cloudflare-dark.svg',
      logoDark: 'https://www.cloudflare.com/img/logo-cloudflare.svg',
      url: 'https://cloudflare.com',
      wideLayout: true,
    },
    {
      name: 'Firecrawl',
      logo: '/logos/firecrawl.svg',
      url: 'https://firecrawl.dev',
    },
    {
      name: 'Sentry',
      logoLight:
        'https://sentry-brand.storage.googleapis.com/sentry-logo-black.svg',
      logoDark:
        'https://sentry-brand.storage.googleapis.com/sentry-logo-white.svg',
      url: 'https://sentry.io',
      wideLayout: true,
    },
    {
      name: 'Autumn',
      logo: 'https://framerusercontent.com/images/xHsZ5kesE5gHQhsj5s69gglY.png?width=53&height=85',
      url: 'https://useautumn.com',
    },
    {
      name: 'CodeRabbit',
      logoLight: '/logos/coderabbit-light.svg',
      logoDark: '/logos/coderabbit-dark.svg',
      url: 'https://coderabbit.ai',
    },
    {
      name: 'Biome',
      logo: '/logos/biome.svg',
      url: 'https://biomejs.dev',
      invertInDark: true,
    },
    {
      name: 'Bun',
      logo: 'https://bun.sh/logo.svg',
      url: 'https://bun.sh',
    },
  ]

  return (
    <section className="mx-auto w-full max-w-7xl py-16">
      <div className="text-center">
        <h2 className="mb-4 text-2xl font-semibold text-muted-foreground">
          Proudly built with
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-8 px-4">
          {technologies.map((tech) => (
            <a
              key={tech.name}
              href={tech.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-2 transition-transform hover:scale-110"
            >
              <div
                className={`flex h-16 items-center justify-center  p-2 transition-all ${tech.wideLayout ? 'w-32' : 'w-16'}`}
              >
                {'logoLight' in tech && 'logoDark' in tech ? (
                  <>
                    <img
                      src={tech.logoLight}
                      alt={`${tech.name} logo`}
                      className="h-full w-full object-contain dark:hidden"
                    />
                    <img
                      src={tech.logoDark}
                      alt={`${tech.name} logo`}
                      className="hidden h-full w-full object-contain dark:block"
                    />
                  </>
                ) : (
                  <img
                    src={'logo' in tech ? tech.logo : ''}
                    alt={`${tech.name} logo`}
                    className={`h-full w-full object-contain ${tech.invertInDark ? 'dark:invert' : ''}`}
                  />
                )}
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
