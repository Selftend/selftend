# PROTOTYPE — throwaway, do not merge

Bench for wayfinder ticket #1811, "The shape of the guest menu — where the Sign in door lands"
(map #1807). Answers: where the guest's `Sign in` door goes in a 288px menu that is already
seven sections deep.

- `bench.html` — three candidate shapes plus the registered-user reference, rendered at the real
  288px popover width using `global.css` tokens and the app's own faces. Toggles: locale
  (en/bg), viewport height (932 / 667 / 568), and whether the guest has saved a name.
  Measures each specimen against `menuMaxHeight = round(windowHeight * 0.7)`.
- `measure.js` — headless pass that prints the readouts for five scenarios.

Published bench: https://claude.ai/code/artifact/67d95907-c0e9-4674-b00f-2abfd588df60

This branch exists only as a primary source for the decision recorded on #1811. Nothing here
ships; the validated decision goes into the spec (#1812), not into this code.
