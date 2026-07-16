# r/AndroidClosedTesting: rules, format, and what works

> Research for [Reddit tester-recruitment wayfinder ticket #109](https://github.com/Selftend/selftend/issues/109),
> resolved 2026-07-16. Part of map issue #108 (ready-to-post Reddit package).

**Method note:** Reddit blocked plain HTTP fetches (403 JS challenge on www/old/api hosts). All primary data below was retrieved live on 2026-07-16 by driving a real browser through the challenge and calling the subreddit's `.json` endpoints in-session (rules.json, about.json, top/hot/new listings, individual comment threads). Claims that could not be confirmed from a primary source are marked **unverified**.

## 1. Rules and posting guidelines

Source: [about/rules.json](https://www.reddit.com/r/AndroidClosedTesting/about/rules.json) (fetched 2026-07-16).

The subreddit has only **three formal rules**, and none prescribe a title format, flair, or post structure:

1. **"Violation"** — _"You are no longer able to participate in this community."_ (a catch-all ban/removal reason, not a behavioral rule).
2. **"Sharing other subreddit link is prohibited"** — verbatim: _"This rule exists to prevent brigading, harassment, spam, and cross-subreddit drama. Attempts to bypass this rule—such as using altered names, coded references, or hints meant to lead users to another subreddit—are also not allowed."_
3. **"Hate speech, Harassment and Abuse"** — standard anti-hate/harassment text.

There is **no required title format and no flair** — flair is impossible: `link_flair_enabled: false` in [about.json](https://www.reddit.com/r/AndroidClosedTesting/about.json), and all 75 sampled posts had `link_flair_text: null`. The **wiki is disabled** (`wiki_enabled: false`; wiki endpoint returns `WIKI_DISABLED`), and the old-Reddit sidebar description is empty. The only self-description: _"A sub for Android developers to post Play Store links for testing. This sub aims to provide people with testers as they may not have 20 testers."_ ~33,400 subscribers, created Nov 2023, SFW.

Two **stickied posts** are the de facto guidance:

- ["App testing requirements for new personal developer accounts, a minimum of 20 testers"](https://www.reddit.com/r/AndroidClosedTesting/comments/186o19d/app_testing_requirements_for_new_personal/) — explains the Google Play closed-testing policy (still cites the old 20-tester figure; current posts uniformly say 12).
- ["Step-by-step instructions to create a Google Group and invite the testers to join"](https://www.reddit.com/r/AndroidClosedTesting/comments/1ptyqc5/stepbystep_instructions_to_create_a_google_group/) — recommends making the Google Group **public** ("Anyone on the web" can search/join/view) so testers can join frictionlessly. Worth verifying the `selftend-testers` group is configured this way before posting.

## 2. Post mechanics

Source: [about.json](https://www.reddit.com/r/AndroidClosedTesting/about.json) (fetched 2026-07-16).

- `submission_type: "any"` — link, image, gallery, video, and text posts are all allowed (`allow_images: true`, `allow_galleries: true`, `allow_videos: true`; polls are not).
- **Images can be embedded inside text posts** — verified in the wild ([example](https://www.reddit.com/r/AndroidClosedTesting/comments/1ukh45h/got_20_testers_from_this_community_but_google/) embeds a `preview.redd.it` image in selftext); screenshots are also routinely posted in comments.
- **Image posts with a selftext body are common and successful** — two of the top-10 posts of the month are screenshot image posts with the funnel links in the body; gallery posts also perform ([example, score 10 / 57 comments](https://www.reddit.com/r/AndroidClosedTesting/comments/1ukjtu7/hi_i_need_testers_ill_also_test_your_apps/)).
- Oddity: `restrict_posting: true` despite `subreddit_type: "public"`. In practice posting is clearly open (~25 posts per 1.5 days from distinct new authors), so this does not appear to be a barrier — **interpretation unverified**.

## 3. Reciprocity norms

**Test-for-test is unambiguously the dominant framing.** In the top-25 posts of the month, every recruitment post offers reciprocity, phrased as "I'll test yours back", "Test for Test", "[Test for Test]", "[B4B]", "Will test back", "will join your test same day".

Observed exchange mechanics (from full comment threads [1umejle](https://www.reddit.com/r/AndroidClosedTesting/comments/1umejle/need_12_testers_ill_test_your_app_back/) and [1uvkk4k](https://www.reddit.com/r/AndroidClosedTesting/comments/1uvkk4k/)):

- Commenters reply "Just downloaded! Mind testing mine in return?" and paste their own Group + opt-in + Play links **in the comment** — asking for links in comments (not DMs) keeps the thread self-sustaining.
- **Screenshots as proof are the norm**: "Send a screenshot after installing and reply with your app link. I'll test your app and send a screenshot back"; "Once you join and upload a screenshot showing that you've installed the game, I will join your group" ([1uptg76](https://www.reddit.com/r/AndroidClosedTesting/comments/1uptg76/)).
- "20/20"-style scoreboard phrasing did **not** appear in samples; the recurring numeric framings are "12 testers" / "12+" / "14 days" / occasionally "20 testers" as an attrition buffer. One dev warns that groups with ~50+ members read as bots and get ignored.
- Sweeteners appear (free lifetime Pro for testers); sincere solo-dev appeals also perform fine.
- **"Thank you, app published" follow-up posts are the highest-scoring genre** in the sub (top 3 of the month, scores 48/31/25) — plan a gratitude follow-up post after approval.

## 4. What high-engagement posts look like

Sources: [top.json?t=month](https://www.reddit.com/r/AndroidClosedTesting/top.json?t=month&limit=25), [hot.json](https://www.reddit.com/r/AndroidClosedTesting/hot.json?limit=25), [new.json](https://www.reddit.com/r/AndroidClosedTesting/new.json?limit=25), all fetched 2026-07-16 (75 posts sampled).

- **Comments, not upvotes, are the engagement currency.** Recruitment posts score 5–10 points but attract **35–102 comments** (each comment ≈ a reciprocal tester). Post volume is high (~25 posts/1.5 days), so posts scroll off /new fast — the body must convert quickly.
- **Title patterns**: almost all combine 2–3 of: tester count ("Need 12 Testers"), reciprocity promise ("I'll Test Your App Back!"), the 14-day duration, and a one-phrase app description. Real examples: "Need 12 Testers – I'll Test Your App Back!", "Test my Wifi & Lan Scanner App for 14 days, I'll test back :)", "[Test for Test] Looking for fellow testers for TwinThrust - in return I'll test your app :)".
- **Body structure** (remarkably uniform; the sub converged on a 3-link numbered funnel):
  1. 1–3 sentences of context (solo dev, what the app is, why testing is needed);
  2. numbered steps: (1) join Google Group → (2) web opt-in (`play.google.com/apps/testing/<package>`) → (3) install from Play;
  3. the ask: keep installed 14 days, open at least once;
  4. reciprocity close: "drop your links in the comments and I'll test back".
- Typical length **100–250 words**. Links go in the body (or under an image post) — never bare link-posts.

Representative example ([1u7fcj8](https://www.reddit.com/r/AndroidClosedTesting/comments/1u7fcj8/looking_for_12_testers_for_closed_testing_for_my/), score 8, 72 comments, image post with body): title "Looking for 12 Testers for closed testing for my Coffee app. Will test in return"; body = app paragraph (notes "no account needed, no ads, no purchases") → "How to join:" numbered Group/opt-in/install/open-once/keep-14-days list → "I will test your app back in return, just create a link in the comments … make sure you are signed up to my google group + have the app downloaded".

## 5. Pitfalls

- **Cross-subreddit links are the main removal trigger** — the only substantive content rule bans linking or even _hinting at_ other subreddits. Don't write "also posted in r/…".
- **Karma / account-age requirements: none found in any primary source.** Visibly new, low-karma throwaway-style accounts post successfully. A hidden AutoModerator threshold remains possible but **unverified** (no AutoMod comments observed in 44+ sampled comments; moderator list is private).
- **Posting cadence limits: none documented** (**unverified**). Reposting the same app for a new 14-day cycle after a Google rejection is normal and accepted ([example](https://www.reddit.com/r/AndroidClosedTesting/comments/1uivrud/)).
- **Discord links are tolerated**: a top-25-of-month post includes a `discord.gg` invite and stayed up ([1uprh5h](https://www.reddit.com/r/AndroidClosedTesting/comments/1uprh5h/)); GitHub and mailto links also appear without removal. The planned end-of-post Discord invite (#108 decision) is safe.
- **No removed posts** in the top-month sample (`removed_by_category: null` on all 25).
- Community-flagged content pitfalls: broken opt-in links ("Item not found") are the #1 complaint — test every link logged out and from a second Google account; oversized groups read as bots; Google may still demand "more testing" after 20+ installs — community advice is to **ship visible app updates during the 14 days** so Google sees active testing ([1ubjk6c](https://www.reddit.com/r/AndroidClosedTesting/comments/1ubjk6c/)).
- Secondary source ([testerscommunity.com guide](https://www.testerscommunity.com/google-play-closed-testing), not from the sub): recruit 16–20 rather than exactly 12 to survive attrition.

## Format template for the Selftend post

A compliant, attractive post for this sub (constraints from `docs/android-closed-testing.md` and map issue #108 applied):

- **Post type**: image (or 2–3-image gallery) post **with a full text body** — screenshots grab attention in the feed and image+body posts are proven top performers; a plain text post is equally compliant if images aren't ready. No flair (none exists).
- **Title** (one line; count + reciprocity + pitch + duration): e.g.
  `Need 12 testers for Selftend (free self-help / wellness app) — I'll test your app back, 14 days`
- **Body** (~150–250 words):
  1. _Context, 2–3 sentences_: solo dev, what Selftend is — including the one woven-in boundary line ("a free self-help/wellness app with private CBT-style thought records — not therapy or crisis support"). No diagnosis/treatment/cure/emergency claims.
  2. _"How to join:" numbered funnel_:
     1. Join the Google Group: <https://groups.google.com/g/selftend-testers>
     2. Become a tester (web opt-in): <https://play.google.com/apps/testing/org.vasilyoshev.selftend>
     3. Install from Play: <https://play.google.com/store/apps/details?id=org.vasilyoshev.selftend>
  3. _The ask_: open the app at least once and keep it installed for 14 days.
  4. _Reciprocity close_: "Drop your Group + opt-in + Play links in the comments and I'll test yours back the same day — happy to swap install screenshots."
  5. _Bonus + Discord last_: web version at <https://selftend.org>; Discord invite as the final line.
- **Never** mention other subreddits anywhere in the post or comments.
- **Before posting**: verify the Google Group is public-joinable per the sticky's instructions, and test all three links from a logged-out browser and a second Google account.
- **Follow-ups**: reply to every commenter and actually reciprocate (screenshot proof); after Play approval, post a short "Thank you!" (optionally with an approval screenshot) — the sub's best-received genre.

## Sources

- [r/AndroidClosedTesting rules JSON](https://www.reddit.com/r/AndroidClosedTesting/about/rules.json) — fetched 2026-07-16
- [r/AndroidClosedTesting about JSON](https://www.reddit.com/r/AndroidClosedTesting/about.json) — fetched 2026-07-16
- [Top posts, month](https://www.reddit.com/r/AndroidClosedTesting/top.json?t=month&limit=25) / [hot](https://www.reddit.com/r/AndroidClosedTesting/hot.json?limit=25) / [new](https://www.reddit.com/r/AndroidClosedTesting/new.json?limit=25) — fetched 2026-07-16
- Sticky: [testing requirements](https://www.reddit.com/r/AndroidClosedTesting/comments/186o19d/app_testing_requirements_for_new_personal/); sticky: [Google Group setup](https://www.reddit.com/r/AndroidClosedTesting/comments/1ptyqc5/stepbystep_instructions_to_create_a_google_group/)
- Example threads: [1umejle](https://www.reddit.com/r/AndroidClosedTesting/comments/1umejle/need_12_testers_ill_test_your_app_back/), [1u7fcj8](https://www.reddit.com/r/AndroidClosedTesting/comments/1u7fcj8/looking_for_12_testers_for_closed_testing_for_my/), [1ukjtu7](https://www.reddit.com/r/AndroidClosedTesting/comments/1ukjtu7/hi_i_need_testers_ill_also_test_your_apps/), [1uptg76](https://www.reddit.com/r/AndroidClosedTesting/comments/1uptg76/), [1ukh45h](https://www.reddit.com/r/AndroidClosedTesting/comments/1ukh45h/got_20_testers_from_this_community_but_google/), [1ubjk6c](https://www.reddit.com/r/AndroidClosedTesting/comments/1ubjk6c/), [1uprh5h](https://www.reddit.com/r/AndroidClosedTesting/comments/1uprh5h/), [1uivrud](https://www.reddit.com/r/AndroidClosedTesting/comments/1uivrud/)
- Secondary: [testerscommunity.com closed-testing guide](https://www.testerscommunity.com/google-play-closed-testing)
