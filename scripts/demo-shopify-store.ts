// A demo store built like a Dawn-theme Shopify store, used for the README media.
// It has six common problems and is otherwise done properly:
// - an app adds the Product JSON-LD with JavaScript, so it is not in the HTML
// - a redirect app sends every missing page to the homepage
// - the homepage headline is an <h2>, so there is no <h1>
// - product images have no alt text
// - robots.txt.liquid was replaced with plain text, dropping Shopify's defaults
// - product cards link through /collections/.../products/...
//
// Run it, then audit it:
//   node scripts/demo-shopify-store.ts
//   node skills/seo-audit/scripts/audit.ts http://localhost:4180 --pages 12
import { createServer } from 'node:http';

const PORT = Number(process.argv[2] ?? 4180);
const base = `http://localhost:${PORT}`;
const products = [
  ['linen-shirt', 'Linen Shirt', '68.00', 'shirts'],
  ['oxford-shirt', 'Oxford Shirt', '58.00', 'shirts'],
  ['chore-jacket', 'Chore Jacket', '128.00', 'jackets'],
  ['field-jacket', 'Field Jacket', '148.00', 'jackets'],
  ['wool-beanie', 'Wool Beanie', '32.00', 'accessories'],
  ['canvas-tote', 'Canvas Tote', '38.00', 'accessories'],
];
const collections = [['shirts', 'Shirts'], ['jackets', 'Jackets'], ['accessories', 'Accessories']];

const page = (path: string, title: string, description: string, body: string, head = ''): string => `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} &ndash; Northwind Supply</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${base}${path}">
<link rel="icon" href="/cdn/shop/files/favicon.png">
<meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:image" content="${base}/cdn/shop/files/og.png">
<link href="/cdn/shop/t/2/assets/base.css" rel="stylesheet">
<script>window.Shopify = window.Shopify || {}; Shopify.shop = "northwind-supply.myshopify.com"; Shopify.theme = {"name":"Dawn","id":1};</script>
${head}</head><body>
<header><a href="/">Northwind Supply</a><nav>${collections.map(([h, n]) => `<a href="/collections/${h}">${n}</a>`).join(' ')} <a href="/pages/about">About</a></nav></header>
<main>${body}</main>
<footer><a href="/pages/about">About</a> <a href="/collections/all">Shop all</a></footer></body></html>`;

// Product cards link through the collection, like many older themes do.
const card = ([handle, name, price, col]: string[]): string => `<div class="card"><a href="/collections/${col}/products/${handle}"><img src="/cdn/shop/files/${handle}.jpg" width="600" height="600"><h3>${name}</h3></a><span>$${price}</span></div>`;

const copy = (name: string): string => `<p>The ${name} is cut from heavyweight fabric that softens with every wash. It is made in Portugal in small runs, and it comes in sizes XS to XXL. We ship to the US, Canada and the UK, and returns are free for 30 days.</p><p>Care: machine wash cold and hang to dry. Every piece is checked by hand before it ships.</p>`;

function route(path: string): string | null {
  if (path === '/') {
    const head = `<script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Northwind Supply","url":"${base}/"}</script>`;
    return page('/', 'Northwind Supply', 'Workwear-inspired shirts, jackets and accessories, made in small runs in Portugal.', `<h2 class="banner__heading">Workwear made to last</h2><p>Shirts, jackets and accessories in natural fabrics, made in small runs in Portugal and shipped from our studio.</p>${products.map(card).join('')}`, head);
  }
  const col = /^\/collections\/([^/]+)$/.exec(path);
  if (col) {
    const found = collections.find(([h]) => h === col[1]) ?? (col[1] === 'all' ? ['all', 'Shop all'] : null);
    if (!found) return null;
    const items = products.filter((p) => found[0] === 'all' || p[3] === found[0]);
    return page(path, found[1], `${found[1]} from Northwind Supply, made in small runs in Portugal.`, `<h1>${found[1]}</h1><p>Our ${found[1].toLowerCase()} are made in Portugal from natural fabrics that last for years. Each piece is cut in small runs by a family workshop, washed before it ships so it will not shrink, and covered by free returns for 30 days. Pick your usual size, or read the size guide on each product page.</p>${items.map(card).join('')}`);
  }
  const prod = /^\/(?:collections\/[^/]+\/)?products\/([^/]+)$/.exec(path);
  if (prod) {
    const p = products.find(([h]) => h === prod[1]);
    if (!p) return null;
    const [handle, name, price] = p;
    // An app builds the Product JSON-LD in the browser, so it is not in the HTML.
    const app = `<script>document.addEventListener('DOMContentLoaded',function(){var s=document.createElement('script');s.type='application/ld+json';s.textContent=JSON.stringify({"@context":"https://schema.org","@type":"Product","name":${JSON.stringify(name)},"offers":{"@type":"Offer","price":"${price}","priceCurrency":"USD"}});document.head.appendChild(s);});</script>`;
    return page(`/products/${handle}`, name, `${name} in heavyweight natural fabric, made in Portugal. $${price}, free returns for 30 days.`, `<h1>${name}</h1><img src="/cdn/shop/files/${handle}.jpg" width="1200" height="1200"><img src="/cdn/shop/files/${handle}-2.jpg" width="1200" height="1200"><p>$${price}</p>${copy(name)}<button>Add to cart</button>`, app);
  }
  if (path === '/pages/about') return page(path, 'About us', 'Northwind Supply makes workwear-inspired clothing in small runs in Portugal.', `<h1>About Northwind Supply</h1><p>We started Northwind Supply to make clothes that last. Everything is made in small runs by a family workshop in Portugal, from natural fabrics that soften with wear.</p><p>We ship from our studio and answer every email ourselves.</p>`);
  return null;
}

createServer((req, res) => {
  const path = (req.url ?? '/').split('?')[0];
  const html = { 'content-type': 'text/html; charset=utf-8', 'powered-by': 'Shopify' };
  if (path === '/robots.txt') {
    // A robots.txt.liquid replaced with plain text, which drops Shopify's defaults.
    res.writeHead(200, { 'content-type': 'text/plain' }).end(`User-agent: *\nDisallow: /admin\nDisallow: /cart\nDisallow: /checkout\nSitemap: ${base}/sitemap.xml\n`);
    return;
  }
  if (path === '/sitemap.xml') {
    res.writeHead(200, { 'content-type': 'application/xml' }).end(`<sitemapindex>${['products', 'collections', 'pages'].map((t) => `<sitemap><loc>${base}/sitemap_${t}_1.xml</loc></sitemap>`).join('')}</sitemapindex>`);
    return;
  }
  const maps: Record<string, string[]> = { '/sitemap_products_1.xml': products.map(([h]) => `/products/${h}`), '/sitemap_collections_1.xml': collections.map(([h]) => `/collections/${h}`), '/sitemap_pages_1.xml': ['/', '/pages/about'] };
  if (maps[path]) {
    res.writeHead(200, { 'content-type': 'application/xml' }).end(`<urlset>${maps[path].map((p) => `<url><loc>${base}${p}</loc></url>`).join('')}</urlset>`);
    return;
  }
  if (path.startsWith('/cdn/shop/')) {
    res.writeHead(200, { 'content-type': path.endsWith('.css') ? 'text/css' : 'image/png' }).end('x');
    return;
  }
  const body = route(path);
  if (body) res.writeHead(200, html).end(body);
  // A redirect app sends every missing page to the homepage.
  else res.writeHead(301, { location: '/' }).end();
}).listen(PORT, () => console.log(`demo store on ${base}`));
