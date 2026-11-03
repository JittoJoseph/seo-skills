# How do I edit robots.txt on Shopify without breaking my SEO?

**Short answer:** Most stores never need to. Shopify's default robots.txt already keeps crawlers out of carts, checkout, accounts, and sorted or tag-filtered collection pages. If you do need a change, add a `robots.txt.liquid` template, keep the loop that outputs Shopify's default rules, and add your rule inside it. Never replace the file with plain text.

## Check your store

```text
Audit my Shopify store https://yourstore.com
```

The audit reads your robots.txt and tells you:

- whether Googlebot and Bingbot can crawl the store (`search-crawlers-allowed`)
- whether Shopify's default rules for sorted and filtered collections are still there (`shopify-robots-defaults`)
- whether AI search crawlers such as OAI-SearchBot, Claude-SearchBot and PerplexityBot are blocked (`ai-search-crawlers`)

## What the default file does

From Shopify's documentation, the key default rules are:

| Rule | Why |
|---|---|
| `Disallow: /cart/`, `/checkout`, `/checkouts/` | Unique to each shopper |
| `Disallow: /account`, `/orders` | Private pages |
| `Disallow: /collections/*sort_by*` | The same products in a different order |
| `Disallow: /collections/*+*` | Tag-filtered copies of a collection |

## Add a rule safely

1. Go to **Online Store > Themes > Edit code**.
2. Click **Add a new template**, choose **robots**, and create it. The template starts with Shopify's default loop.
3. Add your rule inside the loop, for the group you want. Shopify's developer docs have [examples](https://shopify.dev/docs/storefronts/themes/seo/robots-txt).
4. Save, then open `yourstore.com/robots.txt` and read it. Check that each rule is on its own line.

Shopify warns that its support cannot help with this file, and that wrong edits can lose all traffic.

## Common mistakes

- **Replacing the template with plain text.** You lose Shopify's future updates to the default rules.
- **Two rules on one line.** A missing line break merges two rules into one that matches nothing. Read the live file after every edit.
- **Blocking AI crawlers by accident.** An app or a copied snippet can add `Disallow: /` for GPTBot or other bots. Blocking AI training crawlers is your choice, but blocking OAI-SearchBot, Claude-SearchBot or PerplexityBot can keep you out of AI search answers.

To go back to the default, delete `robots.txt.liquid`.

## Sources

- [Shopify: Editing robots.txt.liquid](https://help.shopify.com/en/manual/promoting-marketing/seo/editing-robots-txt)
- [Shopify developers: Customize robots.txt](https://shopify.dev/docs/storefronts/themes/seo/robots-txt)
- [OpenAI: Crawlers](https://platform.openai.com/docs/bots)
