# Security Policy

## Scope
This repository is a public, static portfolio site. It must remain free of secrets, private credentials, and internal-only operational data.

## Supported Version
Security fixes are applied to `main`.

## Reporting a Vulnerability
If you discover a vulnerability or accidental data exposure:

1. **Do not open a public issue with sensitive details.**
2. Report privately via GitHub security advisories for this repository.
3. Include:
   - Impact summary
   - Reproduction steps
   - Affected file/path
   - Suggested mitigation (if available)

## Public Repository Data Rules
Never commit:

- `.env` files, API keys, tokens, certificates, private keys
- Internal hostnames/IP ranges tied to real infrastructure
- Private documents, personal notes, or employer-confidential runbooks
- Local editor state or machine-specific files

Always use placeholders and generalized examples in technical posts.

## Pre-Push Checklist
Before pushing to `main`:

- Run `git status` and review every changed file
- Run a local secret scan (or regex search) for keys/tokens/passwords
- Confirm no local-only directories are tracked
- Run `npm run build` to verify clean publication output

## Incident Response (Accidental Secret Commit)
If sensitive data is committed:

1. Revoke/rotate the exposed secret immediately.
2. Remove the file/value from current code.
3. Rewrite Git history to purge the secret.
4. Force-push corrected history.
5. Document what was rotated and verify exposure is remediated.
