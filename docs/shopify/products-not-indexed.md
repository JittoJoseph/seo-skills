# My Shopify products say "Crawled - currently not indexed". How do I find out why?

**Short answer:** Google fetched the page and chose not to index it. On a Shopify store this is usually one of four things: the page is a duplicate URL you never wanted indexed, the product text is thin or copied, the page is hard to reach through internal links, or the theme or an app adds a `noindex`. Check them in that order. You don't need a paid app to do it.

## Check the store in two minutes

With [SEO Skills](../../README.md) installed, ask your agent:

```text
Audit my Shopify store https://yourstore.com and tell me why products might not be indexed
```

The audit reads your store the way a crawler does. It checks `noindex` tags, canonical tags, robots.txt, the sitemap, Product data in the HTML and the links between pages, and shows the evidence for each finding.

## 1. Sort the affected URLs

In Google Search Console, open **Indexing > Pages**, click **Crawled - currently not indexed**, and export the list. Sort the URLs by type:

| URL looks like | What it is | Action |
|---|---|---|
| `/products/blue-shirt` | The real product page | Keep reading |
| `/collections/shirts/products/blue-shirt` | A collection copy of the product | Usually fine. See [duplicate product URLs](duplicate-product-urls.md) |
| `/products/blue-shirt?variant=123` | A variant URL | Fine if its canonical points to `/products/blue-shirt` |
| `/collections/shirts?filter...` or `?sort_by=` | Filtered or sorted copies | Fine. Shopify's robots.txt keeps crawlers out of most of these |

Often half the list is URLs you never wanted in Google anyway.

## 2. Inspect one real product URL

Paste a `/products/` URL into the **URL Inspection** tool. Compare **User-declared canonical** with **Google-selected canonical**. If Google picked a different URL, it sees the page as a duplicate of that one.

## 3. Rule out a block

- Open the product page, view the source, and search for `noindex`. A theme edit or an app can add it to every page.
- Check that the product is **Active** and published to the **Online Store** sales channel.
- A store with a password page is invisible to Google. Turn it off in **Online Store > Preferences**.

## 4. Make the page worth indexing

This is the usual real fix:

- Rewrite copied manufacturer descriptions. Add sizes, materials, care, who it is for, and answers to the questions customers ask.
- Link the product from a collection, related products and a blog post or guide.
- Add copy to thin collection pages, so they are more than a grid of photos.
- Make sure Product data (price, availability) is in the HTML. See [Product schema](product-schema.md).

## 5. Ask for a recrawl once

After the fix, request indexing for your most important URLs, or validate the fix in Search Console. Then check the count weekly. It can take weeks to change.

## Sources

- [Shopify: Hiding a page from search engines](https://help.shopify.com/en/manual/promoting-marketing/seo/hide-a-page-from-search-engines)
- [Google: Consolidate duplicate URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Google: Page indexing report](https://support.google.com/webmasters/answer/7440203)
