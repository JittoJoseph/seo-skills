# Shopify SEO checklist: what to check before you pay for an SEO app

**Short answer:** Shopify already handles sitemaps, canonical tags, robots.txt and `llms.txt` for you. Most ranking problems on Shopify come from a few settings and theme details that an app won't fix on its own. Check the twelve items below first. The free SEO Skills audit checks most of them in one run.

```text
Audit my Shopify store https://yourstore.com
```

## Can search engines and AI crawlers see the store?

- [ ] **The password page is off.** Online Store > Preferences. Audit check: `shopify-store-public`.
- [ ] **The store uses its own domain**, not `yourstore.myshopify.com`. Settings > Domains. `shopify-custom-domain`.
- [ ] **No `noindex` on pages you want found.** View the source of the homepage and a product page and search for `noindex`. `indexable`.
- [ ] **robots.txt doesn't block Google, Bing or AI search crawlers.** `search-crawlers-allowed`, `ai-search-crawlers`.
- [ ] **Shopify's default robots.txt rules are still there**, if you customized `robots.txt.liquid`. `shopify-robots-defaults`. See [robots.txt](robots-txt.md).
- [ ] **The sitemap is submitted** in Google Search Console: `yourstore.com/sitemap.xml`. `sitemap-found`.

## Do product pages give crawlers what they need?

- [ ] **Product data is in the HTML**, with price and availability. `shopify-product-schema`. See [Product schema](product-schema.md).
- [ ] **Every product has a unique title and meta description.** Product > Search engine listing. `title-unique`, `description-unique`.
- [ ] **Product images have alt text.** `image-alt`.
- [ ] **Product links use `/products/` URLs.** `shopify-product-links`. See [duplicate product URLs](duplicate-product-urls.md).

## Does the store answer what shoppers ask?

- [ ] **Product pages state the facts shoppers filter on**: sizes, materials, care, shipping countries, who it is for. This is what AI assistants quote.
- [ ] **You know which questions shoppers ask AI about your products**, and which page answers each one. See [ChatGPT visibility](chatgpt-visibility.md).

## Then decide on an app

If the list is clean, you may not need an SEO app. If you want one, pick it for a job the list shows you need, such as bulk-editing meta descriptions or alt text, not for features Shopify already gives you, such as sitemaps or `llms.txt`.

## Sources

- [Shopify: Editing robots.txt.liquid](https://help.shopify.com/en/manual/promoting-marketing/seo/editing-robots-txt)
- [Shopify: Hiding a page from search engines](https://help.shopify.com/en/manual/promoting-marketing/seo/hide-a-page-from-search-engines)
- [Shopify: Shopify Catalog and product discovery for agentic storefronts](https://help.shopify.com/en/manual/online-sales-channels/agentic-storefronts/products)
- [Google: Product structured data](https://developers.google.com/search/docs/appearance/structured-data/product)
