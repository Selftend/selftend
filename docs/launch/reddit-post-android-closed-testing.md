# Reddit post: r/AndroidClosedTesting tester recruitment

Ready-to-post package for recruiting Google Play closed-test testers. Post this
verbatim as an **image gallery post with body text** on r/AndroidClosedTesting.
Format and conventions come from
[docs/research/2026-07-16-reddit-androidclosedtesting-format.md](research/2026-07-16-reddit-androidclosedtesting-format.md)
(wayfinder map [#108](https://github.com/Selftend/selftend/issues/108)).

## Title

```text
Need 12 testers for Selftend — free, open-source self-help app. I'll test yours back! (14 days)
```

## Images (gallery, in this order)

All in [`reddit-post/`](reddit-post/):

1. `banner-hero.png` — brand hero banner (leads the gallery; grabs feed attention)
2. `screen-dashboard.png` — dashboard with sample data
3. `screen-breathing.png` — box-breathing session
4. `screen-cbt-home.png` — CBT module home

`reddit-post/banner.html` is the banner source; re-render at 1600×900 if the
copy ever changes.

## Body

```text
Hi all, solo dev here. I've been building **Selftend** — a free, open-source self-help and wellness app: guided CBT-style thought records, mood check-ins, breathing, journaling, gratitude, and habits. No ads, no subscriptions. (To be clear: it's a self-help tool, not therapy or crisis support.)

It's ready for Google Play closed testing and I need 12+ testers to get it over the line.

**How to join:**

1. Join the Google Group: https://groups.google.com/g/selftend-testers
2. Become a tester (web opt-in): https://play.google.com/apps/testing/org.vasilyoshev.selftend
3. Install from Google Play: https://play.google.com/store/apps/details?id=org.vasilyoshev.selftend

Then just open the app at least once and keep it installed for 14 days.

**Test for test:** drop your Group + opt-in + Play links in the comments and I'll join your test the same day — happy to swap install screenshots.

Curious first? There's a web version at https://selftend.org. Questions or feedback: Discord — https://discord.gg/pdaAr9FhcQ
```

## Posting checklist

Before posting:

- [ ] Confirm the Google Group is set to public-joinable ("Anyone on the web"
      can search, join, and view), per the subreddit's sticky guidance.
- [ ] Test all three links from a logged-out browser **and** a second Google
      account — broken opt-in links are the sub's #1 complaint.
- [ ] No flair to select (the subreddit has none) and no title format rules.
- [ ] Do not mention or hint at any other subreddit — the sub's one hard
      removal rule. Applies to comments too.

After posting:

- [ ] Reply to every commenter; join their test the same day and swap install
      screenshots. Keep link exchanges in the comments, not DMs.
- [ ] Ship at least one visible app update during the 14-day window so Google
      sees active testing.
- [ ] After Play approval, post a short "Thank you" follow-up (optionally with
      the approval screenshot) — the sub's best-received post genre.
