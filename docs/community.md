# Community And Popularization

Selftend should feel like a mission-led community project with clear maintainership, not a personal app. Keep contribution paths simple, recognize non-code work, and let the project outgrow one person's inbox.

## Channels

- GitHub is the source of truth for code, docs, issues, PRs, and roadmap decisions.
- Discord is the preferred real-time contributor channel when volume justifies it. Server structure, roles, and moderation process are documented in [discord-server.md](discord-server.md).
- Slack can be reconsidered later if the community needs a formal workspace.
- Shared aliases should cover `hello@`, `support@`, `security@`, and `contributors@`; early forwarding to one inbox is fine.

## Early Contributor Paths

Welcome code, docs, UX/design, accessibility, translation, QA/device testing, moderation, product, and content editing. See [contributor-roles.md](contributor-roles.md) for role-specific onboarding.

## Support Surface

The app support page should link to:

- GitHub repository and contribution guide
- acknowledgements or gratitude page
- donation path
- legal, privacy, and crisis pages
- support contact route

## Public Growth

How Selftend reaches people is decided in [marketing-plan.md](marketing-plan.md), and this section defers to it. Two things that document settles supersede the earlier guidance here: channels are worked **one at a time** in dated windows rather than several in parallel, and copy never opens on privacy or leads with free — the message is derived from the frame sentence in [positioning.md](positioning.md), which fixes what may be said first.

What stays true for the community side: make GitHub docs readable, publish the mission, and set up channels only when there is someone to serve. Contributor channels — GitHub, Discord, Weblate — are places people chose to follow and are published to when the project ships something; they are never counted as acquisition, never mailed, and never used to reach anyone by their behaviour or absence.

Avoid guilt-based retention, fake urgency, and panic marketing.

## Recognition And Donations

Public thanks should value docs, design, QA, translation, moderation, content, and code. Donations are acceptable only when optional, transparent, separate from product access, and framed as sustaining the mission rather than buying care.

### Donation path — decided 2026-09-02

Owner ruling, recorded from [#1625](https://github.com/Selftend/selftend/issues/1625):

- **Vehicle: GitHub Sponsors, on the owner's personal account.** No legal entity is formed for this, and none is planned. Bulgaria is a supported region for individuals, personal-account sponsorships carry no platform fee, and one-off and monthly both work (checked against GitHub's own docs, 2026-09-02). Ko-fi is the fallback if Sponsors onboarding stalls.
- **Where it shows:** one plain item labelled **Donate** at the end of the app sidebar, after Support, wherever the sidebar items show; and the repository Sponsor button via `.github/FUNDING.yml`. Both open the Sponsors page and nothing else.
- **What it never is:** a modal, a banner, a badge, a count, or a prompt — and it is never tied to use, absence, progress, or any fact about the person. A donation surface is reviewed as a behavioural nudge would be, and this one is a static link.
- **Transparency:** one sentence on the Sponsors page and in [costs.md](costs.md) saying what the money covers — hosting, the developer programmes, the domain, the audio plan. No running total is published; a stale number is worse than none.
- **Policy copy** moves from "may be introduced" to present tense, which bumps the policy version and re-consents every user once. Accepted: a terms document that misstates a money fact is the worse trade.
- **Durability stays closed** as a value claim. Money at this scale covers costs, not the maintainer's time, which the positioning work names as the project's failure mode. The reopen trigger in [positioning.md](positioning.md) is amended accordingly.
- **Tax and reporting** on donations to an individual are the owner's responsibility. Accepted 2026-09-02.
- This ruling also settles the seller-entity question the same way: the App Store seller stays an individual account ([#1618](https://github.com/Selftend/selftend/issues/1618)).

## Community crisis posture

Decided 2026-09-05 on [#1947](https://github.com/Selftend/selftend/issues/1947). One posture for every community venue - Reddit ([reddit-community.md](reddit-community.md)), Discord ([discord-server.md](discord-server.md)), and the support inbox ([operations-runbook.md](operations-runbook.md)). Each venue doc holds only its own mechanics; the rule of conduct lives here.

**The rule.** When someone appears to be in distress: reply **once**, warmly, as a person; say plainly that this place is not monitored by crisis responders; point to local emergency services for immediate danger and to Find A Helpline for someone to talk to; do not counsel, do not diagnose, do not promise follow-up. Keep the exchange where the person started it. The comment or message is never removed for being distress.

**What this is not.** Not therapy, not crisis intervention, not emergency support. The community mirrors the app's own crisis page: country-neutral, no hand-curated hotline numbers, the EU emergency number 112 named only where the app already names it.

**The reference reply.** A human adapts and sends it; no bot ever posts it. It mirrors `policies:crisis` in both languages, stays inside [positioning.md § Words never to use](positioning.md#words-never-to-use), prescribes no return, and uses hyphens because Reddit copy does.

English:

> Thank you for saying this here - I'm sorry things are this heavy right now. This community isn't monitored by crisis responders, so it can't be the right support for what you're describing - but there are people who can be. If you might be in immediate danger, please contact your local emergency services now. For someone to talk to, findahelpline.com lists free helplines by country, many of them 24/7.

Bulgarian:

> Благодаря, че го споделяш тук - съжалявам, че в момента ти е толкова тежко. Тази общност не се наблюдава от кризисни специалисти, така че не може да бъде подходящата подкрепа за това, което описваш - но има хора, които могат. Ако е възможно да си в непосредствена опасност, моля, свържи се веднага с местните спешни служби (в България и в целия ЕС: 112). За човек, с когото да поговориш, findahelpline.com изброява безплатни линии за подкрепа по държави, много от тях денонощни.

**Refused, and chosen rather than defaulted into:** keyword auto-responders on any venue; a monitoring or reply-time promise; country-specific helpline lists; removing distress posts; any obligation beyond the one reply.

## Moderation Note

Do not add public or semi-public community features inside the app until moderation, abuse handling, and child-safety processes exist.
