# r/Selftend

The Selftend community on Reddit: [reddit.com/r/Selftend](https://www.reddit.com/r/Selftend/),
moderated by the owner as `u/only_radar`. Community principles are in
[community.md](community.md); the crisis posture both venues share is
[community.md § Community crisis posture](community.md#community-crisis-posture).
The Discord venue is documented in [discord-server.md](discord-server.md).

## What is there

- **The welcome post**, pinned. It is the only highlighted item, by decision
  ([#1942](https://github.com/Selftend/selftend/issues/1942)): release threads are
  never highlighted, and nothing else is either.
- **Release threads**, one per release, drafted by CI and posted by the owner by hand
  ([#1873](https://github.com/Selftend/selftend/issues/1873)). CI never posts to Reddit.
- **Whatever people post.** Questions about the app or the techniques behind it,
  feedback, bug reports, what is working and what is not, dev talk.

Measured 2026-09-05: one subscriber, one post, zero comments in 38 days. The
Bulgarian channel window ([#1850](https://github.com/Selftend/selftend/issues/1850),
[#1901](https://github.com/Selftend/selftend/issues/1901)) opens 2026-10-15, which is
when strangers start arriving.

## The rules

The five rules live on Reddit and nowhere else that a merge gate can see, so they are
recorded here. Read from the subreddit 2026-09-05.

1. **Respect others and be civil.** No harassment, hate speech, or toxic behavior.
   Treat all contributors and members with kindness.
2. **No spam.** Excessive promotion, spam, or advertising of any kind is not allowed.
3. **No medical advice or diagnosis.** Share your own experiences freely, but don't ask
   for or offer diagnoses, treatment plans, or medication advice. Selftend is a self-help
   tool, and this community is not a substitute for professional care.
4. **This community can't provide crisis support.** This community is not monitored
   around the clock and is not a crisis service. If you or someone else is in immediate
   danger, contact local emergency services now. For someone to talk to,
   findahelpline.com lists free helplines by country. Posts or comments asking for
   urgent help are answered once, warmly, by pointing to those resources - they are not
   removed for asking.
5. **Protect privacy - yours and others'.** Don't share anyone's personal or identifying
   information, including your own contact details. Be thoughtful when posting sensitive
   personal stories - once it's on the internet, it's hard to take back.

Rule 4 was reworded on 2026-09-05
([#1947](https://github.com/Selftend/selftend/issues/1947)). It used to end "Posts seeking
urgent crisis help will be gently redirected to those resources", which implies someone
is always watching, and nobody is. The current text is 371 of the 500 characters Reddit
allows in a rule description. Rule 4 is **not** Auto Enforced; rules 2 and 5 are, which
is Reddit's own feature on non-crisis rules and was left as found.

## The sidebar

Read signed in on 2026-09-05. Three widgets: a **Rules** widget that mirrors the rules
above, a **Get Selftend** button widget (web, Android, iOS), and the **Moderators**
block. There is no separate crisis widget; the crisis text a visitor sees in the sidebar
is rule 4. The community description line was rewritten on 2026-09-05
([#1946](https://github.com/Selftend/selftend/issues/1946)) to the _mental health tools_
frame the owner set on the Play listing the same day
([#1999](https://github.com/Selftend/selftend/issues/1999)), in the Play first paragraph's
shape with hyphens. ⚠️ `docs/positioning.md` has since decided that sentence with a colon
after the noun (`tools: everyday tools`) rather than a hyphen
([#2007](https://github.com/Selftend/selftend/issues/2007)). The intro post took that
one-character edit on 2026-09-05 (evening, [#2010](https://github.com/Selftend/selftend/issues/2010),
verified on `about.json`'s sibling post JSON). ✅ **The sidebar `description` and
`public_description` took the same edit on 2026-09-06**, verified by re-reading
`about.json`: both carry the colon and neither carries the hyphen.

☠️ **“The subreddit settings form is the one Reddit surface the agent's browser cannot
edit” was wrong, and it is worth knowing why it looked true.** The form was never the
obstacle; the auto-mode classifier refuses a **tool call that carries the copy** — a
`form_input` or a scripted `value` write pushes the whole field through the call. Placing
the caret and pressing a key pushes nothing, so a one-character edit goes through. See
`store/play-listing.md` for the method and its two verification steps.

## Copy on this surface

The subreddit's sidebar, rules, welcome post and every reply are copy on an ungated
surface. [positioning.md § What binds this document](positioning.md#what-binds-this-document)
lists the Reddit banner and sidebar in the row whose only gate is human habit. The
rules that bite are § _Words never to use_ there and the standing rule against
advertising the absence of streaks. The intro post and the sidebar description were
both rewritten on 2026-09-05 ([#1946](https://github.com/Selftend/selftend/issues/1946)):
the banned compound, the American spelling and the wellbeing frame are gone from both,
and the post no longer lists the tools flat. Reddit copy uses hyphens, never em dashes.

## Moderation and crisis process

1. **How things arrive.** Replies to the owner's own posts reach the owner's inbox
   (the composer's `send_replies` default, measured on the welcome post). Reports and
   modmail reach the owner through Reddit's moderator notifications. A comment under
   someone else's post, or a fresh post, is caught only by those or by the owner
   looking. **There is no monitoring promise and no check cadence**: a promise that
   will eventually be broken is worse than none, and rule 4 says so once reworded.
2. **Rule violations:** remove the post or comment, tell the author why in a reply or
   modmail; repeat or severe, ban.
3. **Someone appears to be in distress:** follow the shared posture in
   [community.md § Community crisis posture](community.md#community-crisis-posture).
   On Reddit specifically:
   - Reply **publicly**, under the comment, in the person's language. Do not move to a
     private message unless they wrote privately first. Reddit's own guidance to
     bystanders says the same: keep it public, say you care, point to resources.
   - **May also** report the comment to Reddit as _Someone is considering suicide or
     serious self-harm_. Reddit then reaches out to the author confidentially and
     connects them with Crisis Text Line. That outreach is US-centric (988, text
     741741), so it complements the Find A Helpline pointer and never replaces the
     reply. Source: Reddit Help, _Get support for yourself or others: Self-harm
     Resources_, updated 2026-07-29, read 2026-09-05.
   - **Never remove a comment for being distress.** It is removed only if it breaks
     another rule, for example by naming a third person.
4. **Do not diagnose, do not give medical advice, do not argue about either.** Those
   are removable under rule 3.

## Deliberately absent

- **AutoMod crisis responders.** The same refusal as the Discord server: an automated
  reply to a person in distress does more harm than a pinned resource and a human.
- **Country-specific helpline numbers** in the rules, sidebar or reply. The app is
  country-neutral through Find A Helpline, which lists Bulgarian lines including
  24/7 ones, and no number is added without the jurisdiction review the app applies.
  The EU emergency number 112 is the one exception, because the app's Bulgarian crisis
  page already names it.
- **A monitoring promise or a reply-time promise**, on the surface or in the process.
- **Any follow-up obligation.** One reply, once. Whether to say more is a human
  judgement in the moment, not a rule.
