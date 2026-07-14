# Changelog

## [0.3.1](https://github.com/Selftend/selftend/compare/v0.3.0...v0.3.1) (2026-07-14)


### Bug Fixes

* **overlays:** pass pointerEvents box-none as prop so overlays don't swallow taps ([#36](https://github.com/Selftend/selftend/issues/36)) ([a4d8e9e](https://github.com/Selftend/selftend/commit/a4d8e9e78681d091a589e95d5959bf7d9d02d5f1))

## [0.3.0](https://github.com/Selftend/selftend/compare/v0.2.1...v0.3.0) (2026-07-14)


### Features

* **analytics:** add aggregate engagement report (activation, retention, module adoption) ([0ff68e0](https://github.com/Selftend/selftend/commit/0ff68e0bafcb900d808764ee10731e4a8f6b005f))
* **reminders:** one-time contextual reminder prompt after first tool completion ([ba75b50](https://github.com/Selftend/selftend/commit/ba75b5012effa832d8c82731ef0ef16329cce06a))


### Bug Fixes

* **e2e:** normalize -0 offset in journal occurrence test on UTC runners ([fb2da22](https://github.com/Selftend/selftend/commit/fb2da22eb58b32cefb848e4a8eb33af9eefbd10a))
* **sentry:** remove wizard-injected Sentry.init with PII and session replay ([eb743cb](https://github.com/Selftend/selftend/commit/eb743cbde507be035c494870d5ec41b5b40bdf5b))

## [0.2.1](https://github.com/Selftend/selftend/compare/v0.2.0...v0.2.1) (2026-07-12)


### Bug Fixes

* **deps:** override postcss to ^8.5.10 (resolves GHSA-qx2v-qp2m-jg93 XSS in CSS stringify) ([6b786cc](https://github.com/Selftend/selftend/commit/6b786cc534ebe7dd63903c3beef3eed158cc86d3))

## [0.2.0](https://github.com/Selftend/selftend/compare/v0.1.0...v0.2.0) (2026-07-10)


### ⚠ BREAKING CHANGES

* **widgets:** previously placed launcher widgets are orphaned by the provider swap (pre-release, no external users).

### Features

* **auth:** dedicated /sign-in route and consistent back-to-sign-in targets ([b8cefcc](https://github.com/Selftend/selftend/commit/b8cefccb8841d019444567a152d553e2513b5b21))
* **cbt:** guided new-user flow for the thought record ([058b189](https://github.com/Selftend/selftend/commit/058b18937e554718fa4df358ecef229ff2631d31))
* **community:** dedicated crisis-resources channel for Server Guide resources ([2e6bc93](https://github.com/Selftend/selftend/commit/2e6bc93728d16156104e99e577bfa9c349c0c39e))
* **community:** Discord server buildout - setup script, permanent invite fix, and server docs ([77f4903](https://github.com/Selftend/selftend/commit/77f4903260175a4de8d036f5466101d2327299a5))
* **community:** replace welcome channel with links directory, drop android-testing ([f23f057](https://github.com/Selftend/selftend/commit/f23f057937c0299ad34357eec0c6bb24e796aad2))
* **landing:** landing-page copy (en + bg) ([518dc94](https://github.com/Selftend/selftend/commit/518dc941ddef3a531758d73d802a2e0db314efde))
* **landing:** public web landing page for signed-out visitors ([c11950c](https://github.com/Selftend/selftend/commit/c11950c80b775c64f886b6556a42695779df79d3))
* **modules:** plain-language module glosses, where-to-start line, full-name nav a11y labels ([e64ae45](https://github.com/Selftend/selftend/commit/e64ae45e35fb786847eca99fc6e36301d8b909c6))
* **onboarding:** explain what Selftend is and gloss CBT/ACT in the wizard ([4ccfef2](https://github.com/Selftend/selftend/commit/4ccfef2027189edf828c4194d18f11fa596b5eda))
* **progress:** reachable Progress page with Check-in rename and module counts ([3d5deaa](https://github.com/Selftend/selftend/commit/3d5deaa7cc20d579c6aa5f1f9e41d410c12463e9))
* **safety:** slim crisis bar on exercise forms; keep full callout on module homes ([dd1ea0a](https://github.com/Selftend/selftend/commit/dd1ea0aac1f1aac1e10ec41a4bb39ec8fb017664))
* store links, Discord visibility, and feedback discoverability ([13364fe](https://github.com/Selftend/selftend/commit/13364fe18d5db5be1bd8d1b67361ee05bf5cce01))
* team QA hardening rounds - auth links, carousel, keyboard, a11y, drafts ([9d063fa](https://github.com/Selftend/selftend/commit/9d063fab198dd13f7c9eaa81446da4efd6400294))
* **tours:** trim first-run tips to 3 on the home dashboard; remove per-page coach marks ([cdc9c41](https://github.com/Selftend/selftend/commit/cdc9c41def42a28383e7b7b89f0d4ad8e5f2504e))
* **widgets:** single configurable Selftend launcher widget replaces Mood/Today/Shortcuts ([40d4c5a](https://github.com/Selftend/selftend/commit/40d4c5a1fbf438b1f5ff25af4a5ddd67361877e0))
* **wizard:** collapse the step indicator to one line on narrow screens ([3bad7ab](https://github.com/Selftend/selftend/commit/3bad7ab6301b0087509abec8ba4a233c516ed5a5))


### Bug Fixes

* **auth:** distinguish rate-limited and already-verified resend outcomes ([2200776](https://github.com/Selftend/selftend/commit/2200776a9180a378932aac0adf076f2d6686a1fb))
* **auth:** restyle email templates and remove dead magic-link flow ([5e227a0](https://github.com/Selftend/selftend/commit/5e227a0a2459a1fdc9e9cb4e7499f8ac34df2d62))
* **cbt:** render emotion and pattern display labels instead of stored slugs ([b429993](https://github.com/Selftend/selftend/commit/b429993694e2b3db89365f88f2c9f36977f05c7a))
* **cbt:** restore dispute prompts and retitle distortion guide to "Thinking patterns" ([95558de](https://github.com/Selftend/selftend/commit/95558dea729c68c5bf9c1ba473f44a83fec98e0a))
* **community:** update Discord invite to the current permanent link ([a0e9964](https://github.com/Selftend/selftend/commit/a0e99646a15ef8b3a21cf44bcf66956fe8beecb2))
* **help:** constrain help-sheet width and group sections into readable blocks ([18be1aa](https://github.com/Selftend/selftend/commit/18be1aa0b2c783f7411dbdbf519b90e8721fec6f))
* **landing:** calmer hero copy and preview carousel with correct image framing ([fd91ea8](https://github.com/Selftend/selftend/commit/fd91ea8bdfc0977271a92d7ffb05f96ea364fb52))
* lint scripts with .cjs extension (Buffer global) ([63b80af](https://github.com/Selftend/selftend/commit/63b80af3d09c50bdad8451c5b70c653d427052a5))
* **profile:** use display name for avatar initial and account menu ([4e49b72](https://github.com/Selftend/selftend/commit/4e49b720d4622657bffa86a5b3c03ba78aa13148))
* **tools:** calm, muted empty-state sublines instead of red uppercase ([cbc8fa4](https://github.com/Selftend/selftend/commit/cbc8fa4b9ad3c5d726a8f35fc085a8091d60e5a5))
* **web:** resolve console warnings on load (deprecated RN-Web props) ([138309c](https://github.com/Selftend/selftend/commit/138309c9a5795e4094472ee9f82517f1805e0b85))
* **widgets:** launcher card polish - borderless frame, bottom-anchored CTAs, slider tracking, config safe areas ([e09a407](https://github.com/Selftend/selftend/commit/e09a407648263eb0649e7a922501520d76289009))
