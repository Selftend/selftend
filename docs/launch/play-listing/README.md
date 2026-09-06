# Play Store listing assets

- `feature-graphic.png` — the 1024×500 feature graphic for the Play Console
  store listing (issue #201 → store-listing polish). Upload as-is: Play Console →
  Store presence → Main store listing → Feature graphic. ☠️ Saving hides in
  the ⋮ menu and needs a Publishing-overview submit; uploading it costs one
  more Play review, so bundle it with another Console visit.
- `feature-graphic.html` — the source it is rendered from (same technique as
  `../reddit-post/banner.html`: open in a browser, screenshot the `.banner`
  element at 1024×500 CSS pixels). Edit this and re-screenshot to regenerate;
  it pulls the app icon from `assets/icon.png` and the phone mockups from
  `../reddit-post/screen-*.png`. ⚠️ Serve the repo over HTTP rather than
  opening a `file:` URL — the relative asset paths resolve either way, but
  browser-automation tools block the `file:` protocol.

**The copy it carries** (#2022, 2026-09-05 reposition): the headline is the
short form _“Private mental health tools.”_ and the line beneath it is the
frame sentence in the brand-omitted form `auth:landing.subtitle` uses, because
the brand block already prints “Selftend”. The sentence is not decoration:
`docs/positioning.md`'s clause 1 requires the method on any surface that names
the category, and since the category noun stopped carrying CBT, the sentence is
the only thing putting it there. ☠️ The headline is set at 28px, not 30 — at
30 it measures exactly the 380px column and wraps to a `…mental health / tools.`
orphan.

☠️ **The phone screenshots inside the graphic predate v0.5.0** (same captures
as the Reddit banner) and publish the American spellings `verify` bans in app
copy — _“Cognitive Behavioral Therapy”_, _“Your CBT program”_ — which is a
defect rather than acceptable staleness, tracked on #2041. The listing's actual
screenshot slots still need fresh captures from the current build (owner step on
#201); the same visit fixes both.
