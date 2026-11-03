# Security

## Reporting a problem

Please report security problems privately through [GitHub's advisory form](https://github.com/JittoJoseph/seo-skills/security/advisories/new) rather than in a public issue.

## What the audit does

- **It only reads.** It sends GET requests to the site you give it, and changes nothing there.
- **It stays on the site.** It samples pages on the same origin, at low concurrency, and follows robots.txt when sampling. It also makes a few one-off requests: the `http://` and `www` versions of the host, and the page's `og:image`, which may be on another host.
- **It stays out of your network.** If you audit a public site, it refuses to follow redirects or fetch an `og:image` on `localhost` or a private IP address written directly in a URL. It doesn't resolve DNS names first, so a public name that points at a private address isn't caught.
- **It sends no data anywhere else.** There is no telemetry and no account.
- **It limits what it reads.** Requests have a timeout and a size cap.

## Untrusted content

Everything a site returns is untrusted, and that matters because an AI agent may read the report. Text quoted from a site is flattened, shortened and placed in inline code. The skill also tells the agent never to follow instructions found in that text. This reduces the risk of prompt injection, but no filter can remove it completely, so review what your agent proposes before you approve it.
