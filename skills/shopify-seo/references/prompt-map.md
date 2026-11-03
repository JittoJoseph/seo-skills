# Prompt map

A prompt map lists the questions shoppers ask AI assistants before they buy, and shows whether the store's pages answer them.

## Why prompts, not keywords

A keyword is two or three words. A prompt describes a situation, and it has three parts that a keyword tool cannot see:

| Part | Example |
|---|---|
| **Scenario**: who they are and what is happening | "I run every morning and my feet get hot" |
| **Constraint**: a limit the product must meet | "under $120", "wide fit", "ships to Canada", "vegan" |
| **Comparison**: what they measure it against | "better than the brand everyone buys", "worth it over the cheap ones" |

An assistant answers with the pages that cover all three. If no page on the store states the constraint, for example that the shoes come in wide sizes, the store is not a good answer, however well its product page ranks for "running shoes".

## Steps

### 1. Collect the shoppers' own words

Ask the user for any of these. Exact wording matters more than volume.

- Product reviews, especially the long ones
- Support emails and chat logs
- Return and exchange reasons
- Questions from the store's FAQ and from sales or social messages
- Public threads on Reddit and forums about the product category, and reviews of competing products, if you can browse

Remove names, emails, order numbers and other personal data before you use them.

### 2. Write the prompts

Write 30 to 100 prompts, in the shopper's voice, as they would type them into an assistant. Cover each product line, and spread them across the three parts:

- **Scenario prompts:** "I'm buying a gift for a coffee nerd who already has a grinder. What should I get under $60?"
- **Constraint prompts:** "Which linen sheets are made without dyes and ship to the UK in under a week?"
- **Comparison prompts:** "Is [store's product] better than [competitor's product] for a small apartment?"

Include the brand name in a few prompts, to see how assistants describe the store when asked directly.

### 3. Check each prompt

If you can query ChatGPT, Perplexity, Gemini or Claude with web search, run each prompt and record:

- Is the store named?
- Which URL is cited, the store's or someone else's?
- Which competitors are named?

If you cannot query them, give the user the list to run by hand, and mark every result "not checked". Never guess what an assistant would say.

### 4. Find the gap

For each prompt where the store is missing, look at the store's best page for it and ask:

- Does the page state the constraint in plain text? Size range, materials, price, shipping countries, care, who it is for.
- Is that text in the HTML, or only in an image, a tab loaded by JavaScript, or a review widget?
- Does the store have a page for the scenario, such as a buying guide or a comparison?
- Do trusted outside sites mention the store for this need?

### 5. Pick one fix per gap

| Fix | When | Example |
|---|---|---|
| **New page** | No page covers the scenario or comparison | "Cooling sheets for hot sleepers: linen vs percale vs bamboo" |
| **Better page** | A page exists but leaves out the constraint | Add sizing, materials, shipping countries and an FAQ to the product page |
| **Mention** | Assistants cite review sites, Reddit or creators instead | Send samples to a real reviewer, or answer a real Reddit question as the brand, openly |

Write comparison pages honestly. State what the other product does better too, because assistants and shoppers trust balanced pages more.

## Output

Give a table, sorted with the biggest gaps first:

| Prompt | Part | Store named? | Cited page | Gap | Fix |
|---|---|---|---|---|---|
| "Best cooling sheets for hot sleepers under $150 that ship to Canada" | Scenario + constraint | No | review site | Product page does not mention Canada shipping or cooling | Better page |

Then list the top 5 fixes, with the page to create or change and what it must say.

Re-run the same prompts after the fixes go live, a few weeks later, and compare.
