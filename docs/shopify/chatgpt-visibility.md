# Why doesn't ChatGPT recommend my Shopify store?

**Short answer:** AI assistants find products in two ways. The first is Shopify Catalog, which sends your product data to ChatGPT and Microsoft Copilot when your store is eligible. The second is the open web, where they cite pages that answer the shopper's exact question. Most stores fail the second one because shoppers ask about situations and limits, and the store's pages never state them. A prompt map finds those gaps.

## 1. Check that the basics are not blocking you

```text
Audit my Shopify store https://yourstore.com
```

Fix these first if the audit flags them:

- **Password page on** (`shopify-store-public`). No crawler can see the store.
- **AI search crawlers blocked** (`ai-search-crawlers`). OAI-SearchBot, Claude-SearchBot and PerplexityBot fetch pages for AI answers.
- **No Product data in the HTML** (`shopify-product-schema`). AI crawlers read price and availability from it.
- **Content only in JavaScript** (`content-in-html`). Common on headless stores.

## 2. Check Shopify Catalog

In your Shopify admin, open **Sales channels > Agentic**. Next to **Shopify Catalog** you see either the number of products in the catalog, or **Ineligible** with the reason. ChatGPT and Microsoft Copilot can only show products through Shopify Catalog when the store is eligible.

You don't need an app to create `llms.txt`. Every Shopify store serves `/agents.md`, `/llms.txt` and `/llms-full.txt` already.

## 3. Build a prompt map

Shoppers don't ask an AI for "linen sheets". They ask:

> "I sleep hot and my partner doesn't. What's better than the big-name brands for cooling sheets under $150 that ship to Canada?"

That prompt has a **scenario** (sleeps hot), a **constraint** (under $150, ships to Canada) and a **comparison** (the big-name brands). An assistant cites the pages that cover all three. A keyword tool shows none of it.

Ask your agent:

```text
Build a prompt map for my Shopify store https://yourstore.com
```

The `shopify-seo` skill helps you:

1. Collect your shoppers' own words from reviews, support emails and return reasons.
2. Turn them into 30 to 100 prompts, grouped by scenario, constraint and comparison.
3. Run the prompts in ChatGPT, Perplexity, Gemini or Claude, and record whether your store is named and which page is cited.
4. Give each gap one fix: a new page, a better existing page, or a mention on a site your shoppers trust.

The method is in [prompt-map.md](../../skills/shopify-seo/references/prompt-map.md).

## What doesn't help

- An `llms.txt` app. Shopify already serves the file.
- Keyword-stuffed product descriptions. Assistants look for specific facts, such as sizes, materials, shipping and who the product is for.
- Fake reviews or fake Reddit posts. They break platform rules and lose trust quickly.

## Sources

- [Shopify: Shopify Catalog and product discovery for agentic storefronts](https://help.shopify.com/en/manual/online-sales-channels/agentic-storefronts/products)
- [Shopify developers: llms.txt.liquid](https://shopify.dev/docs/storefronts/themes/architecture/templates/llms-txt-liquid)
- [OpenAI: Crawlers](https://platform.openai.com/docs/bots)
- [Google: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)
