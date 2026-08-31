> **Base branch:** `dev` — only `hotfix/*` and the `dev→main` promotion PR target `main`. **PR title:** PRs into `dev` are squash-merged, so use a Conventional Commit title (`feat:`, `fix:`, `docs:` …) — it becomes the commit that drives versioning. Promotion, hotfix, and Weblate translation PRs merge as **merge commits** instead — never squash a Weblate PR. See [docs/releasing.md](../docs/releasing.md).

## Summary

- what changed
- why it changed

## Review Context

- docs or roadmap updates:
- important test, CI, or manual verification context:

## Product guardrails

- [ ] no dark patterns or punitive mechanics introduced
- [ ] no AI therapist framing added
- [ ] no diagnosis, treatment, emergency-support, or therapist-replacement claims added
- [ ] no new tracking, analytics, ads, paywalls, or social scope added without explicit review
- [ ] reminders, streaks, quests, notifications, or progress mechanics remain optional and non-punitive
- [ ] Architectural change (service/host/provider/domain/dependency/credential)? → control-tower updated (issue filed or inventory.md edited), or N/A
- [ ] Copy saying what Selftend _is_ matches `docs/positioning.md`? Ungated surfaces (AlternativeTo, GitHub repo description/topics, Reddit, video narrations, Play listing) updated too, or N/A

## Review Notes

- Privacy/safety impact:
- Accessibility impact:
- Translation/i18n impact:
- Dependency or license impact:
