# Portfolio Security and Privacy Rules

## Public/static assumptions

- This is a static public site. Do not add runtime secrets, server-only keys, service accounts, or private data to source or `public/`.
- `.env.example` documents that no secrets are required; preserve this unless architecture changes explicitly.

## Content privacy

- Keep employer/customer references generalized and public-safe.
- Avoid internal URLs, IPs, hostnames, usernames, tickets, credentials, private system names, and non-public deployment details.
- `public/docs` is deployed as-is; treat CV/cover-letter PDFs and docs as public artifacts.
- `agent/` appears private/local in `.gitignore` but is referenced by docs; decide intent before moving or publishing its contents.

## Web security

- Preserve outbound-link `rel="noopener noreferrer"` where applicable.
- Do not weaken CSP/referrer/robots metadata in `BaseLayout.astro` without explicit reason.
- Keep `SECURITY.md` and `public/.well-known/security.txt` aligned; review canonical URL against `https://sergiiob.dev`.
