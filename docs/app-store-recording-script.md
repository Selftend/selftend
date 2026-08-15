# App Review recording script — Selftend iOS

For [Task: capture Selftend's recording](https://github.com/Selftend/selftend/issues/1008), under map [Selftend's iOS submission](https://github.com/Selftend/selftend/issues/998).

Apple's Guideline 2.1 letter asks for **a screen recording captured on a physical device**. This is the tap-by-tap script for it. It is written to be followed by someone who has never used the app, because that is who is holding the phone — **the person recording is not the person who wrote the app**, and nothing here should need a judgement call.

Companion to [`app-store-review-information.md`](./app-store-review-information.md), which holds the seven written answers. ⚠️ That document deliberately describes **build 6** and must not be resynced to `dev`; the same is true of this one. Both describe the binary under review.

---

## For whoever hands the phone over — not for the person recording

Two things to settle before the helper starts, because neither is discoverable from the phone.

1. **Which way does sign-up go in production?** `sign-up-form.tsx` branches on whether Supabase returns a session immediately: an **autoconfirm** project drops the new user straight into the app, a **confirmation-mode** project sends them to a _"Verify your email"_ screen. Step 2 covers both, but ⚠️ the autoconfirm branch puts a **brand-new, empty account** on screen — the exact thing a _2.1 App Completeness_ rejection is about — so if that is the live setting, make sure the helper has read step 2(b) and knows to sign out at once. Checking takes seconds in the Supabase dashboard; guessing does not.
2. **Hand over the two passwords** (`demo@selftend.org`, `vasil.yoshev+delete-demo@gmail.com`) and confirm both still sign in. ⚠️ **Never trigger a password reset, resend or recovery against `demo@selftend.org`** — it is SQL-created and non-deliverable, and the bounce damages the project's sender reputation.

---

## Before you start

**Record `0.11.1 (6)`. Not the newest build.** TestFlight offers the newest build by default, and this app's internal group also holds **0.13.0 (9)**, which has a redesigned home screen that is **not** the one Apple is reviewing. Recording it would show App Review something that does not exist in the submission.

- In TestFlight, open **Selftend**, tap **Previous Builds**, and choose **0.11.1 (6)**.
- If a tester group exists that contains only build 6, use that and this problem disappears.
- ⚠️ **Check the version on screen before recording.** If you cannot confirm you are on build 6, stop and ask.

**Three accounts. They are not interchangeable, and one of them must never be deleted.**

| Where it is used             | Account                                    | Note                                                                                                                                                                                |
| ---------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Step 2 — registration        | **`vasil.yoshev+review-signup@gmail.com`** | Created live on camera. Deliverable, so the confirmation mail lands somewhere real — ⚠️ never invent an address, a bounce damages the project's sender reputation. Do not verify it |
| Steps 4–10 — the walkthrough | **`demo@selftend.org`**                    | ☠️ **Never approach a delete control while signed in as this account.** It is App Review's own sign-in; deleting it would lock the reviewer out                                     |
| Step 11 — deletion           | **`vasil.yoshev+delete-demo@gmail.com`**   | Exists already, sign-in verified, and holds a few entries so the deletion visibly removes something                                                                                 |

You will be given the two passwords separately. ⚠️ **The one you invent at step 2 has to clear two checks** — at least 12 characters, and not a password known from a public breach. See step 2.

**Recording settings**

- **Silent.** No narration, no music. The written answers carry the explanation.
- Use the iPhone's built-in screen recorder (Control Centre). Take as long as you need — there is no time limit, and retakes are free.
- ⚠️ **Turn on Do Not Disturb** first. A notification banner sliding over the app mid-take shows App Review someone else's message.
- Move at a **readable pace**. Let each screen sit for a beat before tapping. A reviewer is watching this to confirm the app works, not to admire your speed.
- If you fumble a step, **keep going** — the take can be trimmed, and a restart costs more than a pause.

---

## The script

### 1. Cold launch, and the safety footer

Force-quit the app first, so the recording begins at a genuine cold launch.

Open **Selftend**. You land on a screen with the app icon, **"Selftend"**, the line _"Calm, guided self-help tools for personal reflection."_, and a sign-in form.

**Scroll down on this screen without tapping anything else.** Below the form is a short safety paragraph — _"Selftend is for guided self-help when there is time and safety to reflect. It is not emergency support and is not monitored by crisis responders."_ — and a row of links: **Open crisis guidance**, Terms, Privacy, Cookies.

**Let that sit on screen for ~3 seconds.** This is the shot proving crisis guidance is reachable **before signing in**, which is one of the written answers.

> ☠️ **Do this now, on this screen, before you navigate anywhere.** This footer exists only on the first screen. If you tap through to sign-up and then come back via _"Already have an account? Sign in"_, you land on a different screen that has **no footer and no crisis link**, and the shot is gone.

### 2. Register a new account, and stop

Tap **Sign up** (at the bottom of the form, after _"Don't have an account?"_).

On **"Create an account"**:

- **Display name** — anything, or leave it; it is optional.
- **Email** — the address you were given for this step (see _Three accounts_ above).
- **Password** and **Confirm password** — the same value.

> ☠️ **Two ways the password gets rejected on camera.** It must be **at least 12 characters**, and it is checked against a database of passwords exposed in real breaches — so `Password1234` and friends come back with _"This password appears in known data breaches."_ **Invent something unmemorable**: three unrelated words plus a number works. Decide it before you start recording, not in the field.
>
> ⚠️ If you get _"An account with this email already exists"_, the address has been used before. **Don't stop** — add something to it before the `@`, e.g. `…+review-signup2@…`, and carry on. It is not worth a retake.

Tap **Sign up**.

**What happens next depends on a server setting, so both are normal. Follow whichever you get:**

**(a) You reach a screen saying "Verify your email".** ✅ **Stop here.** Do not open the mailbox and do not verify. The shot is complete — it shows registration works and that the app asks for confirmation.

**(b) You land straight in the app, on a home screen, with a banner asking you to verify your email.** Also fine — the account was created and you are signed in as it. But:

> ☠️ **Do not explore, and do not record this screen for longer than a couple of seconds.** This is a brand-new account with nothing in it, and an empty app is precisely what Apple's complaint is about. **Sign out immediately** — open the navigation, then the account menu, then **Sign Out** — and go to step 3.

Either way you must **not** verify the email address.

### 3. Sign in as the demo account

Get back to the sign-in form — from **(a)**, tap **Back to sign in**; from **(b)**, you are already signed out and looking at it.

Sign in with **`demo@selftend.org`** and its password. Tap **Continue**.

⚠️ From here until step 10 you are signed in as the account App Review will use. **Do not open Settings › Account, and do not tap anything called Delete.**

### 4. The home dashboard

You land on **Home** — a greeting, today's date, and a dashboard of tool cards. Let it sit for ~3 seconds so the reviewer sees a **populated** app rather than an empty one. This account has 19 mood logs, 5 journal entries, 6 gratitude entries and 3 thought records behind it.

Scroll the dashboard slowly to the bottom and back up.

### 5. A mood check-in, saved and shown in its history

From the dashboard, open the **Check-in** card and log a mood — pick a face, save it.

Then open the navigation and go to **Tools › Mood tracker** to show the entry you just made sitting in the list with the others.

> ⚠️ The tools hub calls this **"Mood tracker"**. The navigation sidebar calls the same thing **"Check-in"**. Both are correct; they are the same tool.

### 6. A journal entry, saved and shown in its history

Go to **Tools › Journal**, tap to add an entry, type two or three sentences of ordinary text, and save.

Show the saved entry in the journal list.

> Write something plainly innocuous. This footage goes to Apple.

### 7. A timed breathing session, run to completion

Go to **Tools › Breathing** and start a session. **Let it run to the end** rather than cutting away — the point is that a timed exercise actually completes and is recorded.

When it finishes you may see **"Nice work. Want a daily reminder?"** with **Set reminder** and **No thanks**.

- **If it appears, tap "Set reminder".** That is a clean, honest demonstration of step 9 in one move, and it shows reminders are _offered_, never on by default.
- If it does not appear, tap **No thanks** if offered and do step 9 instead.

Then show the session in the breathing history.

### 8. The tools hub and the modules

Open **Tools**. Let the list sit for ~3 seconds. It shows **eight** tools: Mood tracker, Journal, Breathing, Gratitude log, Grounding, Meditation, Sleep tracker, Habit tracking.

> This shot matters more than it looks. Apple cited **2.1 App Completeness** — the guideline for apps that look unfinished. A hub of eight working tools, each showing real counts, is the direct answer.

Then open **Modules** and let that sit. Open **CBT** briefly, then go back.

### 9. Enable a reminder — the notification prompt

**Skip this step if the prompt at step 7 already did it.**

Open **Notifications** from the navigation. Turn on a **Daily reminder** for any tool.

iOS will ask **"Selftend" Would Like to Send You Notifications**. **Tap Allow.** Capturing that system prompt is one of the things Apple asks for.

### 10. Set a profile picture — the photo prompt

Go to **Settings › Profile**. Tap **Change photo**.

iOS will ask for photo-library access. **Tap the option that grants it** (_Allow Full Access_ or _Select Photos…_, whichever you prefer). Choose any harmless image.

> ⚠️ If you pick **Select Photos…**, choose a photo that is fine for Apple to see. The picker shows your library on camera.

Wait for **"Profile picture updated."**, then let the new avatar sit on screen for a beat.

### 11. Sign out, and delete a different account end to end

**Sign out** of `demo@selftend.org` — navigation → account menu → **Sign Out**.

Sign in as **`vasil.yoshev+delete-demo@gmail.com`**.

> ☠️ **Check the email on screen before you go near Delete.** If it says `demo@selftend.org`, stop and sign out. Deleting that account destroys App Review's own access and the submission with it.

Go to **Settings › Account**. Tap **Delete my account**.

A confirmation appears: **"Delete account permanently?"**, explaining that this permanently deletes the account and all data. There is a field labelled **"Type DELETE to confirm"** — type **`DELETE`**, in capitals, exactly.

Confirm, and **stay on camera until it finishes** and you are returned to the signed-out screen. Apple wants to see account deletion complete, not merely begin.

### 12. Stop recording

Stop the recording here.

---

## When you hand the recording back

Please also say:

1. **Which iPhone model** — from **Settings › General › About › Model Name**, word for word. ⚠️ Not the marketing guess: this goes to Apple as a statement of fact about what was tested.
2. **Which iOS version** — same screen, _Software Version_.
3. **Whether you have an iPad.** Both apps ship iPad screenshots, and the written answer currently tells Apple that iPad was not tested — truthfully, but it would be better to have tested it. If you have one, we may ask for a short second recording.
4. **Anything that looked broken.** You are the first person outside the project to run this build on a real phone, and that is worth more than the recording. If something was slow, confusing or wrong, say so — it does not go to Apple, it goes to us.

---

## Checked against before sending

Every item below must be visible in the footage. A recording missing one is worse than no recording, because it costs a full review round to discover.

- [ ] The recording is of **0.11.1 (6)**
- [ ] Cold launch, from a force-quit state
- [ ] **Crisis guidance link visible before sign-in**, on the first screen
- [ ] Registration completed — either to the "verify your email" screen, or into the app followed by an **immediate** sign-out
- [ ] Sign-in with `demo@selftend.org` succeeding
- [ ] A populated home dashboard
- [ ] A mood entry created **and** shown in its history
- [ ] A journal entry created **and** shown in its history
- [ ] A breathing session run to completion **and** shown in its history
- [ ] The tools hub showing eight tools
- [ ] The **notification** permission prompt, granted
- [ ] The **photo library** permission prompt, granted
- [ ] Account deletion, end to end, on `vasil.yoshev+delete-demo@gmail.com` — **never** `demo@selftend.org`
- [ ] No notification banners from other apps
- [ ] No audio
