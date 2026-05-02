# GitHub Setup

Last updated: 2026-05-02

## Current state

The project has been renamed to SelfTend. If the GitHub repository is newly created or manually renamed, use:

Create the empty repository first:

- owner: `vasilyoshev`
- name: `selftend`

Remote setup after creation or manual rename:

```bash
git remote add origin git@github.com:vasilyoshev/selftend.git
git branch -M main
git push -u origin main
```

If the old remote already exists, update it only after the GitHub repository has been renamed:

```bash
git remote set-url origin git@github.com:vasilyoshev/selftend.git
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
