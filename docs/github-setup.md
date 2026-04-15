# GitHub Setup

Last updated: 2026-04-15

## Current state

The local repository is initialized and scaffolded, but no GitHub remote is configured yet.

Create the empty repository first:

- owner: `vasilyoshev`
- name: `mental-health`

After that:

```bash
git remote add origin git@github.com:vasilyoshev/mental-health.git
git branch -M main
git push -u origin main
```

## Prepared files

This repo already includes:

- `.github/workflows/ci.yml`
- `.github/pull_request_template.md`
- issue templates
- `.github/labels.yml`

## Suggested labels

Prepared label set:

- `bug`
- `feature`
- `docs`
- `privacy`
- `safety`
- `accessibility`

## PR expectations

- keep PRs focused
- update docs when product behavior changes
- run `npm run typecheck`
- run `npm test -- --runInBand`
- call out privacy, safety, and licensing impact explicitly

## Branching

Practical default:

- protect `main`
- use short feature branches
- prefer draft PRs for larger work

## Immediate follow-up after remote creation

1. push the current scaffold
2. create the prepared labels
3. enable GitHub Actions
4. enable issue templates
5. decide whether to protect `main`
