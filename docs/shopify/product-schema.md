# Does my Shopify store need a schema app?

**Short answer:** Usually not. Most current Shopify themes already output Product JSON-LD with `{{ product | structured_data }}`. What matters is that the data is in the HTML your server sends. If an app adds it with JavaScript in the browser, many crawlers never see it, including most AI crawlers. Check before you install anything.

## Check your store

```text
Audit my Shopify store https://yourstore.com
```

The `shopify-product-schema` check reads the raw HTML of the sampled product pages, the way a crawler that doesn't run JavaScript does. It reports pages with no Product data, Product data with no offers, and offers with no price or availability.

## Why "in the HTML" matters

Google can run JavaScript, but it does so later and not always. Many AI crawlers read only the HTML. If your Product data is created in the browser, a crawler gets a product page with no structured price, stock status or brand.

We have seen large Shopify stores whose product pages build Product JSON-LD with a script after the page loads. In the browser's developer tools the data looks fine. In the raw HTML it isn't there.

To check by hand, use **View Page Source** (not Inspect) on a product page and search for `"Product"`.

## Fix it

1. In the theme code, open the product section, usually `sections/main-product.liquid`.
2. Search for `application/ld+json`. If it isn't there, add:

   ```liquid
   <script type="application/ld+json">
     {{ product | structured_data }}
   </script>
   ```

3. If an app also adds Product data, keep only one source, so the product isn't described twice with different values.
4. Test one product page with Google's [Rich Results Test](https://search.google.com/test/rich-results).

## Sources

- [Shopify: the structured_data filter](https://shopify.dev/docs/api/liquid/filters/structured_data)
- [Google: Product structured data](https://developers.google.com/search/docs/appearance/structured-data/product)
