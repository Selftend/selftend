# Play Store listing assets

- `feature-graphic.png` — the 1024×500 feature graphic for the Play Console
  store listing (issue #201 → store-listing polish). Upload as-is: Play Console →
  Store presence → Main store listing → Feature graphic.
- `feature-graphic.html` — the source it is rendered from (same technique as
  `../reddit-post/banner.html`: open in a browser, screenshot the `.banner`
  element at 1024×500 CSS pixels). Edit this and re-screenshot to regenerate;
  it pulls the app icon from `assets/icon.png` and the phone mockups from
  `../reddit-post/screen-*.png`.

The phone screenshots inside the graphic predate v0.5.0 (same captures as the
Reddit banner). That is acceptable for the decorative feature graphic; the
listing's actual screenshot slots still need fresh captures from the current
build (owner step on #201).
