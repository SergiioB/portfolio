## What changed

<!-- One paragraph: what the change does, not how. Link the issue. -->

## Risk tier

<!-- Set by the change, not by who wrote it. -->

- [ ] **Low** — docs, copy, tests, isolated UI
- [ ] **Medium** — feature code, a screen rewrite, a new dependency
- [ ] **High** — deploy configuration, or content about a current employer

High risk needs a human approver who is not the author. An agent approval is never a human approval,
and an approval covers only the commit it was given on.

## Testing

<!-- Evidence, not a promise: paste the command and its real output, or attach a screenshot. -->

```
npm run build
```

- Checked on: <!-- environment, or "not run" + why -->
- Screenshot / artifact: <!-- path, or n/a -->

A skipped check must be named. "Should work" is not evidence.

## How to revert

- Revert: <!-- `git revert <sha>` / flag off <flag> / restore value of X -->
- Data touched: <!-- migrations, database documents, storage paths — or none -->

## Reviewer checklist

- [ ] Every claim real
- [ ] Build passes
- [ ] Links resolve
- [ ] No secrets
- [ ] Copy passes the no-slop check
