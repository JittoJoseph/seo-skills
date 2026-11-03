# Shopify creates duplicate product URLs in every collection. Do I need to fix it?

**Short answer:** Not urgently. When a theme links to `/collections/shirts/products/blue-shirt`, Shopify's canonical tag on that page still points to `/products/blue-shirt`, so Google normally indexes the right one. But each collection a product is in adds another URL for crawlers to fetch. On a large catalog that wastes crawling. The fix is one small theme change.

## Check your store

```text
Audit my Shopify store https://yourstore.com
```

The `shopify-product-links` check counts how many product links in the sampled pages go through a collection, and shows an example.

You can also check by hand: open a collection, hover over a product, and look at the link. If it contains `/collections/`, your theme uses collection-scoped URLs.

## The fix

1. Go to **Online Store > Themes**, duplicate your live theme, and click **Edit code** on the copy.
2. Search the snippets folder for `within`. Product cards are usually in `card-product.liquid` or `product-card.liquid`.
3. Replace

   ```liquid
   {{ product.url | within: collection }}
   ```

   or `within: current_collection` with

   ```liquid
   {{ product.url }}
   ```

4. Preview the theme, click a few products from a collection, and check the URLs start with `/products/`.
5. Publish the theme.

Breadcrumbs that relied on the collection in the URL may change. Check the product page after the edit.

## What not to do

- Don't add `noindex` to collection product URLs. The canonical tag already handles them.
- Don't block `/collections/*/products/*` in robots.txt. A blocked page can't pass its canonical signal to Google.

## Sources

- [Shopify: the within filter](https://shopify.dev/docs/api/liquid/filters/within)
- [Google: Consolidate duplicate URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
