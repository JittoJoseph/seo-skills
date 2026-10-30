// Best-effort detection of what a site is built on. It only needs to be useful
// as a hint, so every result carries the evidence that triggered it.

interface Probe {
  has(needle: string): boolean;
  header(name: string): string | null;
  generator(pattern: RegExp): boolean;
}

const SIGNATURES: [string, (probe: Probe) => unknown][] = [
  ['Shopify', (s) => s.has('cdn.shopify.com') || s.has('Shopify.theme') || s.header('x-shopid') || s.header('x-shopify-stage')],
  ['WordPress', (s) => s.has('/wp-content/') || s.has('/wp-includes/') || s.generator(/wordpress/i)],
  ['Webflow', (s) => s.has('data-wf-site') || s.generator(/webflow/i)],
  ['Wix', (s) => s.has('static.wixstatic.com') || s.generator(/wix\.com/i)],
  ['Squarespace', (s) => s.has('static1.squarespace.com') || s.generator(/squarespace/i)],
  ['Framer', (s) => s.has('framerusercontent.com') || s.generator(/framer/i)],
  ['Next.js', (s) => s.has('/_next/static/') || s.has('__NEXT_DATA__') || /next\.js/i.test(s.header('x-powered-by') ?? '')],
  ['Nuxt', (s) => s.has('/_nuxt/') || s.has('__NUXT__') || s.generator(/nuxt/i)],
  ['Astro', (s) => s.has('astro-island') || s.has('/_astro/') || s.generator(/astro/i)],
  ['SvelteKit', (s) => s.has('/_app/immutable/') || s.has('__sveltekit')],
  ['Remix', (s) => s.has('__remixContext') || s.has('__reactRouterContext')],
  ['Gatsby', (s) => s.has('___gatsby') || s.generator(/gatsby/i)],
  ['Lovable', (s) => s.has('lovable.dev') || s.has('gptengineer')],
  ['Vite', (s) => s.has('src="/assets/index-') || s.has('/@vite/client') || s.has('type="module" crossorigin src="/assets/')],
  ['Create React App', (s) => s.has('/static/js/main.') || s.has('create-react-app')],
];

export function detectPlatforms(
  html: string | null | undefined,
  headers: Record<string, string> | undefined,
  generator: string | null | undefined,
): string[] {
  const source = html ?? '';
  const probe: Probe = {
    has: (needle) => source.includes(needle),
    header: (name) => headers?.[name] ?? null,
    generator: (pattern) => pattern.test(generator ?? ''),
  };
  return SIGNATURES.filter(([, test]) => test(probe)).map(([name]) => name);
}
