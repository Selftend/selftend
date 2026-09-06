# Play Store listing assets

- `feature-graphic.png` — the 1024×500 feature graphic for the Play Console
  store listing (issue #201 → store-listing polish). Upload as-is: Play Console →
  Store presence → Main store listing → Feature graphic. ☠️ Saving hides in
  the ⋮ menu and needs a Publishing-overview submit; uploading it costs one
  more Play review, so bundle it with another Console visit.
- `feature-graphic.html` — the source it is rendered from (same technique as
  `../reddit-post/banner.html`: open in a browser, screenshot the `.banner`
  element at 1024×500 CSS pixels). Edit this and re-screenshot to regenerate;
  it pulls the app icon from `assets/icon.png` and the phone mockups from the
  `screen-*.png` files beside it. ⚠️ Serve the repo over HTTP rather than
  opening a `file:` URL — the relative asset paths resolve either way, but
  browser-automation tools block the `file:` protocol.
- `screen-cbt-home.png`, `screen-home.png`, `screen-breathing.png` — the three
  phone mockups, 390×844 CSS pixels each.

**The copy it carries** (#2022, 2026-09-05 reposition): the headline is the
short form _“Private mental health tools.”_ and the line beneath it is the
frame sentence in the brand-omitted form `auth:landing.subtitle` uses, because
the brand block already prints “Selftend”. The sentence is not decoration:
`docs/positioning.md`'s clause 1 requires the method on any surface that names
the category, and since the category noun stopped carrying CBT, the sentence is
the only thing putting it there. ☠️ The headline is set at 28px, not 30 — at
30 it measures exactly the 380px column and wraps to a `…mental health / tools.`
orphan.

## Retaking the mockups

☠️ **The mockups are copy, and no gate can read them.** They are pixels, so
`test/positioning-copy.test.ts` cannot see the words inside them — which is how
the previous set shipped the American spellings `verify` bans in app copy
(#2041: the CBT module heading, the programme offer's title and its button, all
captured before [#1627](https://github.com/Selftend/selftend/issues/1627) and
[#1651](https://github.com/Selftend/selftend/issues/1651) landed). No edit in
this repository can fix that; only a fresh capture can. **Re-read the words in
the mockups by eye whenever app copy moves**, because nothing else will.

Retaken 2026-09-06 from **staging** (`https://staging.selftend.org`), which was
already serving the current British spellings while production still lagged —
so check that the build you capture from carries the copy you want, rather than
assuming the newest deploy does:

```
curl -s https://staging.selftend.org/ | grep -o '/_expo/static/js/web/[^"]*\.js'
curl -s "https://staging.selftend.org/<that path>" | grep -c 'Cognitive Behavioural Therapy'
```

Capture recipe: browser viewport 390×844 at DPR 1, screenshot the viewport (not
the full page). A fresh guest reaches all three — clear the age gate and the
consent panel, finish the one onboarding panel, then star a few tools so Home is
not empty. `/` is Home, `/modules/cbt` the CBT module, and `/tools/breathing` →
_Box breathing_ → _Start_ gives the running session.

Two things the 2026-09-06 retake changed beyond the spellings:

- **The middle mockup is Home, not the old Dashboard.** That screen no longer
  exists in the shape the July capture shows — Home is the Favourites/Tools
  layout now. Keeping the old one would have put two app generations side by
  side in the store's lead image.
- **The “Beta” badge is gone from the CBT module header**, so the previous asset
  was advertising a maturity label the app has dropped. Nothing to do about it
  now; recorded because #2041's triage asked the question.

☠️ `../reddit-post/screen-*.png` are deliberately **left alone**. That banner is
posted; its source has to keep reproducing the image on Reddit rather than the
current build, which is the same reason `docs/launch/` sits in the copy test's
`PUBLISHED_RECORDS`. This directory keeps its own captures precisely so the
graphic can be regenerated without disturbing that record.

⚠️ The listing's own screenshot slots are a separate set and still need fresh
captures from the current build (owner step on #201) — as does uploading this
graphic, which no agent can do. Same Console visit.
