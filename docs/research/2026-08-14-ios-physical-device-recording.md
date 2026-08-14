# Capturing a physical-device iOS screen recording with no Apple hardware

Research for [Research: how do you capture a physical-device iOS screen recording with no Apple hardware?](https://github.com/Selftend/selftend/issues/1000), under map [Both iOS submissions rejected under Guideline 2.1](https://github.com/Selftend/selftend/issues/998).

**All prices and product facts checked 2026-08-14.** Verify again before spending money — cloud-testing pricing and device-support matrices both move.

This document **does not choose a route**. It feeds [Grilling: which capture route do we commit to, and who pays for it?](https://github.com/Selftend/selftend/issues/1001).

## The constraint

Apple's rejection letter for both apps demands:

> A screen recording captured on a physical device, running the latest operating system, demonstrating the app's functionality.

The owner has **no iPhone, no iPad and no Mac**, and develops on Windows. That rules out Xcode, QuickTime device capture and iPhone Mirroring. Builds come from EAS in the cloud.

## Finding 1 — a simulator recording is not acceptable

Settled, and it removes the cheapest imaginable option.

Apple's own guidance to developers requiring a demo video is that it must show the app running on a **physical** iOS device, **not** a simulator. Screen-_recording_ software is fine — the objection is to the simulator, not to capturing the screen digitally rather than filming it with a camera.

Guideline 2.1 is also where Apple concentrates this scrutiny: Apple states over 40% of unresolved issues fall under 2.1 App Completeness.

Sources: [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), [RevenueCat — guide to App Store rejections](https://www.revenuecat.com/blog/growth/the-ultimate-guide-to-app-store-rejections), [LiveCode forum — "video shows PHYSICAL iOS device?"](https://forums.livecode.com/viewtopic.php?t=30782).

## Finding 2 — the entitlement problem, which is the crux

Cloud real-device farms install an uploaded `.ipa` by **resigning it with their own wildcard provisioning profile**. BrowserStack documents the consequence plainly: resigning **removes entitlements including App Groups, Push Notifications and Associated Domains**, and although `keychain-access-groups` survives, its **Team ID component is rewritten** — which BrowserStack itself says can affect OAuth implementations "including those using Sign in with Apple".

**Both apps depend on exactly those entitlements.**

| App        | Evidence                                                                                                                                  | Exposure                                                                                                                                                                |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Selftend   | `app.config.ts` sets `usesAppleSignIn: true` (emits `com.apple.developer.applesignin`) and `associatedDomains` when app links are enabled | Sign in with Apple and Google Sign-In are both on the sign-in screen; Sign in with Apple is a documented **Guideline 4.8** compliance point in its own App Review notes |
| WikiCanvas | `app.config.ts` comments reference `com.apple.developer.applesignin` in iOS entitlements (wikicanvas#215)                                 | **Sign-in is exclusively Sign in with Apple / Google OAuth — there are no password accounts at all**                                                                    |

This is the decisive finding. Apple's letter explicitly demands the recording show **"account registration, login, and account deletion flows"**. On a resigned build:

- **WikiCanvas may be unable to demonstrate any of them**, because every one of those flows begins with OAuth. There is no password fallback to fall back to.
- Selftend could still show email/password signup and login, but its Sign in with Apple button — the thing its own notes tell App Review about — would be broken on camera.

Recording a build whose auth is broken, in order to prove the app is complete, is worse than not recording.

Sources: [Re-sign iOS apps](https://www.browserstack.com/docs/app-automate/appium/resign-ios-apps), [iOS entitlements on Custom Device Lab](https://www.browserstack.com/docs/custom-device-lab/app-automate/ios-entitlements), [iOS keychain cleanup and access groups](https://www.browserstack.com/docs/app-automate/appium/advanced-features/ios-keychain-support).

## Finding 3 — the TestFlight escape hatch, and what it costs

Resigning can be avoided by installing the app **from TestFlight** on the cloud device, which uses the genuinely-signed build with entitlements intact. BrowserStack supports this. The restrictions are material:

- **iPhone 14 and above only**, running iOS 16+.
- Sign-in uses **your own Apple ID and password**, typed into a shared remote device. BrowserStack states session data is wiped when the session ends.
- **Apple limits how many devices may sign in to TestFlight.** Once that limit is breached, TestFlight installation is blocked, and the developer must manually delete devices from their Apple account to recover. A public cloud hands you a different physical device most sessions, so the limit is consumed quickly.
- **Two-factor authentication cannot be disabled** on newer Apple accounts, so every session needs a 2FA code — which requires a trusted device or phone number.

⚠️ **Security judgement required, not a technical detail:** the Apple ID in question is the one that owns the Developer Program membership and both App Store listings. Typing its password into a third-party shared device is a real risk, and it is the owner's call, not an implementation choice. A separate tester Apple ID invited to the TestFlight build avoids exposing the account holder's credentials — at the cost of creating and maintaining another Apple ID.

Sources: [Test apps installed via TestFlight using App Live](https://www.browserstack.com/docs/app-live/app-source/testflight), [Sign in to App Store or TestFlight with Apple ID](https://www.browserstack.com/docs/app-live/ios-settings/sign-in), [Can I install apps via TestFlight for Automation?](https://www.browserstack.com/support/faq/app-automate/app/can-i-install-apps-via-testflight-for-automation).

## Finding 4 — recording capability and cost of the farm

BrowserStack App Live does record sessions and export them:

- Session video is downloadable as **`.mp4`**.
- **Recording is capped at 20 minutes per session** — comfortably enough for either app's shot-list, but a real ceiling if both apps were ever recorded in one take.
- Real iOS devices, unlimited interactive testing on the paid tier.

**Cost:** App Live Individual is reported at **$49/month**; team tiers around **$39–49 per user per month**; BrowserStack's entry manual-testing pricing starts around **$29/month**. Sources disagree on the exact tier boundaries, so confirm on the pricing page before purchase.

This is a **recurring** cost against a project whose `docs/costs.md` runs a deliberate $0/month infrastructure posture, and which is free and non-profit by design.

Sources: [Record your App Live test session](https://www.browserstack.com/docs/app-live/session-debugging/record-session), [How can I screen record a session on App Live?](https://www.browserstack.com/support/faq/app-live/test-session-app-live/how-can-i-screen-record-a-session-on-app-live), [BrowserStack pricing guide 2026](https://bug0.com/knowledge-base/browserstack-pricing), [Vendr buyer guide](https://www.vendr.com/buyer-guides/browserstack).

Other farms — LambdaTest, Sauce Labs, AWS Device Farm — were not investigated field-by-field, because **the resigning behaviour is a property of how public device clouds install third-party IPAs**, not a BrowserStack quirk. Any farm should be assumed to resign until its documentation proves otherwise. If the decision leans toward a farm, verify the chosen one's resigning and TestFlight behaviour specifically before paying.

## Finding 5 — buying hardware is cheaper than three months of the alternative

The **iPhone SE (3rd generation, 2022)** is the cheapest current-iOS-capable iPhone. It carries the A15 Bionic chip and runs iOS 26.

| Source                                                      | Price           |
| ----------------------------------------------------------- | --------------- |
| Certified refurbished 64 GB (Swappa / Apple refurbished)    | **$129**        |
| Certified used / refurbished, varying condition and storage | **from ~$100**  |
| Pre-owned 64 GB                                             | **from $94.99** |

⚠️ Confirm the current iOS version and its minimum supported device at purchase time. Search results consulted for this document **contradicted each other** on which iOS release is current in August 2026 — one index insisted iOS 18 was latest while simultaneously describing what iOS 26 drops. The SE 3rd gen is described as running iOS 26 by a 2026-dated source, but Apple's own device-support page is the only authority worth trusting here, and a device that cannot take the _latest_ OS fails Apple's requirement outright.

⚠️ The SE 3rd gen has a 4.7" display. The App Store listings use 6.9" screenshots, so a recording from an SE will look markedly different in aspect and density. Apple asks the recording to demonstrate **functionality**, not to be marketing material, so this is a cosmetic concern rather than a compliance one — but it is worth knowing before buying.

What a physical device also buys, beyond this one recording:

- TestFlight installs directly, with entitlements intact and no resigning, so **Sign in with Apple and Google OAuth simply work**.
- No recording time cap, no per-session Apple ID sign-in, no consumed device slots.
- Unlimited re-takes — and re-takes are likely, since a recording that misses a required item burns a whole review round.
- An honest answer to Apple's **item 2**, "a list of the device models and operating systems the app was tested on".
- Compliance with Apple's own stated expectation in the rejection letter itself: _"Apps are reviewed on physical devices to mirror real-world conditions. Test the app on each supported device platform before submitting."_

Sources: [iPhone SE 3rd Gen price guide 2026](<https://electronics.alibaba.com/buyingguides/iphone-se-3rd-gen-price-guide-(2026)>), [Is it still worth buying iPhone SE 3rd Gen in 2026](https://uptradeit.com/blog/is-it-still-worth-buying-iphone-se-3rd-gen), [Walmart refurbished listing](https://www.walmart.com/ip/Restored-Apple-iPhone-SE-3rd-Gen-Carrier-Unlocked-A2595-64GB-Midnight-Refurbished/1826926545).

## Finding 6 — borrowing, or paying someone to record

Not researched in depth, because both carry a problem no price comparison fixes: the recording must show **account registration, login and deletion**, so whoever holds the device is handling real accounts on production, and for Selftend that means a mental-health app's data. A paid stranger recording sign-in flows is a privacy exposure, not merely a logistics choice.

Borrowing from someone trusted is viable for a single one-off take, but does not survive the likely need for re-takes, and gives a weaker answer to item 2.

## Summary of the routes

| Route                                    | One-off cost | Recurring  | OAuth works?                   | Ready when?    | Main hazard                                                              |
| ---------------------------------------- | ------------ | ---------- | ------------------------------ | -------------- | ------------------------------------------------------------------------ |
| **A.** Farm, upload IPA (resigned)       | —            | ~$39–49/mo | **No — entitlements stripped** | today          | WikiCanvas's account flows may be unrecordable                           |
| **B.** Farm, install via TestFlight      | —            | ~$39–49/mo | Yes                            | today          | Apple ID password on a shared device; device-slot limit; iPhone 14+ only |
| **C.** Buy refurbished iPhone SE 3rd gen | **~$95–130** | none       | Yes                            | after shipping | small 4.7" screen; must confirm it takes the latest iOS                  |
| **D.** Borrow / paid helper              | varies       | —          | Yes                            | varies         | production account handling by a third party                             |
| **E.** Simulator                         | free         | —          | n/a                            | today          | **Explicitly rejected by Apple**                                         |

**The shape of the trade:** Route C costs less than three months of Route A or B and permanently removes the constraint, but cannot be used today. Routes A and B are available immediately, and Route A is likely unusable for WikiCanvas specifically. That tension — _move today_ versus _fix it properly_ — is the decision, and it belongs to the grilling ticket.
