# Shopify fixes for audit findings

How to fix each audit finding on a Shopify store. Admin paths are for the current Shopify admin. Theme fixes are in **Online Store > Themes > Edit code**. Duplicate the theme before you edit code, and preview it before you publish it.

## Shopify checks

### shopify-store-public

The store has a password page, so crawlers only see that page.

- Go to **Online Store > Preferences**, and turn off **Password protection**.
- A trial or development store cannot remove the password until it has a plan.

Source: [Restrict access to your online store](https://help.shopify.com/en/manual/online-store/themes/password-page)

### shopify-custom-domain

The store is served from `yourstore.myshopify.com`.

- Connect a domain in **Settings > Domains**, and set it as the primary domain. Shopify redirects the myshopify.com address to it.

Source: [Domains](https://help.shopify.com/en/manual/domains)

### shopify-product-schema

Product pages have no Product JSON-LD in the HTML, or the offers have no price or availability.

1. Open the product section, usually `sections/main-product.liquid`, and search for `application/ld+json`.
2. If there is none, add this at the end of the section:

   ```liquid
   <script type="application/ld+json">
     {{ product | structured_data }}
   </script>
   ```

3. If an app adds the data with JavaScript, the audit cannot see it, and many AI crawlers cannot either. Use an app or theme that renders it in the HTML. Keep one source, so the product is not described twice.
4. Check one product page with Google's [Rich Results Test](https://search.google.com/test/rich-results).

Sources: [structured_data filter](https://shopify.dev/docs/api/liquid/filters/structured_data), [Google: Product structured data](https://developers.google.com/search/docs/appearance/structured-data/product)

### shopify-product-links

Product cards link to `/collections/name/products/handle`.

- In the product card snippet, often `snippets/card-product.liquid` or `snippets/product-card.liquid`, replace `{{ product.url | within: collection }}` or `within: current_collection` with `{{ product.url }}`.
- Shopify's canonical tag already points to `/products/handle`, so this is a crawl clean-up, not an emergency.

Source: [within filter](https://shopify.dev/docs/api/liquid/filters/within)

### shopify-robots-defaults

A custom `robots.txt.liquid` lets crawlers into sorted and tag-filtered collection URLs.

- Open `templates/robots.txt.liquid`. Keep the loop over `robots.default_groups`, and add custom rules inside it. Do not replace the file with plain text.
- To go back to Shopify's default file, delete `robots.txt.liquid`.
- Shopify says incorrect edits to this file can lose all traffic, and its support cannot help with them.

Sources: [Editing robots.txt.liquid](https://help.shopify.com/en/manual/promoting-marketing/seo/editing-robots-txt), [Customize robots.txt](https://shopify.dev/docs/storefronts/themes/seo/robots-txt)

## General checks, the Shopify way

| Finding | Fix on Shopify |
|---|---|
| `title-*`, `description-*` | Product, collection or page > **Search engine listing** > Edit. Homepage: **Online Store > Preferences**. |
| `h1-present` | The theme heading setting, or the `<h1>` in the section template. Each page needs one. |
| `image-alt` | Product > click the image > **Add alt text**. Theme images: the image setting in the theme editor. |
| `indexable` | Search `layout/theme.liquid` and apps for `noindex`. Hide single items on purpose with the `seo.hidden` metafield or the Unlisted product status. |
| `canonical-*` | `layout/theme.liquid` should have `<link rel="canonical" href="{{ canonical_url }}">` once. |
| `soft-404` | Shopify returns real 404s by default. An app that redirects every missing page to the homepage causes this. Use **URL redirects** for specific old URLs instead. |
| `sitemap-*` | Shopify makes `/sitemap.xml` for you. Submit it in Google Search Console. You cannot edit it directly. |
| `page-status`, `sitemap-urls-healthy` | For deleted products, add a redirect under **URL redirects** in the admin (search for "redirects"). |
| `hreflang` | Use Shopify Markets with subfolders or domains. It adds hreflang tags for you. |
| `host-consolidation`, `redirect-chain` | Set one primary domain in **Settings > Domains**. |
| `open-graph`, `og-image-reachable` | **Online Store > Preferences > Social sharing image**, plus the product's own images. |
| `ai-search-crawlers` | Check `robots.txt.liquid` and apps for rules that block OAI-SearchBot, Claude-SearchBot or PerplexityBot. |
| `content-in-html` | Common on headless or Hydrogen stores that render in the browser. Render product content on the server. |
| `jsonld-present` | Add Organization JSON-LD to the homepage, with facts that match the page. |
| `internal-links` | Link collections from the menu, and link related products and blog posts to each other. |

Sources: [Hiding a page from search engines](https://help.shopify.com/en/manual/promoting-marketing/seo/hide-a-page-from-search-engines), [URL redirects](https://help.shopify.com/en/manual/online-store/menus-and-links/url-redirect)

## AI shopping answers

- **Shopify Catalog** sends product data to ChatGPT and Microsoft Copilot when the store is eligible. Check **Sales channels > Agentic** in the admin for the product count or the reason it is ineligible.
- Every store serves `/agents.md`, `/llms.txt` and `/llms-full.txt`. No app is needed. To change them, add an `agents.md.liquid` template.
- Blocking AI crawlers in robots.txt only affects open-web discovery. It does not stop Shopify Catalog.

Source: [Shopify Catalog and product discovery for agentic storefronts](https://help.shopify.com/en/manual/online-sales-channels/agentic-storefronts/products)
