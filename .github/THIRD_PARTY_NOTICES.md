# Third-Party Notices

This file tracks copied or generated third-party code that needs explicit notice handling. It is not a complete dependency license inventory.

## React Native Reusables

Source: https://github.com/founded-labs/react-native-reusables

Use:

- generated UI primitives under `src/components/react-native-reusables`
- registry/theme glue in `components.json`, `global.css`, `tailwind.config.js`, `metro.config.js`, `lib/utils.ts`, and `lib/theme.ts`

License: MIT

```text
MIT License Copyright (c) 2025 Founded Labs

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR
ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH
THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

## shadcn/ui Notice Trail

React Native Reusables states that it uses code from `shadcn/ui` under the MIT License.

Source: https://github.com/shadcn-ui/ui

No web `shadcn/ui` components were copied directly. This notice remains because React Native Reusables is a shadcn-style component registry.

## UI Support Dependencies

Direct UI support dependencies:

- `@rn-primitives/*`: MIT
- `class-variance-authority`: Apache-2.0
- `clsx`: MIT
- `expo-image-manipulator`: MIT
- `expo-image-picker`: MIT
- `react-easy-crop`: MIT
- `tailwind-merge`: MIT
- `tailwindcss-animate`: MIT

## Bundled Fonts

The app bundles Noto Sans via `@expo-google-fonts/noto-sans` (body text) and Nunito via `@expo-google-fonts/nunito` (the `Nunito_800ExtraBold` display face). Both fonts are licensed under the SIL Open Font License 1.1 (OFL-1.1); the npm package wrappers are MIT.

Sources: https://fonts.google.com/noto/specimen/Noto+Sans and https://fonts.google.com/specimen/Nunito

License: SIL Open Font License 1.1 - see the full text shipped with each package at `node_modules/@expo-google-fonts/noto-sans/LICENSE` and `node_modules/@expo-google-fonts/nunito/LICENSE`.

## Google Sign-In Branding

`assets/branding/google-logo.png` is Google's "G" mark, used on the Sign in with Google button. Its use is governed by Google's Sign-In branding guidelines, not a copyright license.

Source: https://developers.google.com/identity/branding-guidelines

## Dependency License Posture

The 67 direct production `dependencies`, read from installed package metadata on 2026-08-27, break down as 64 MIT, 1 Apache-2.0 (`class-variance-authority`), and 2 dual MIT/OFL-1.1 (`@expo-google-fonts/noto-sans`, `@expo-google-fonts/nunito`). No AGPL/GPL/LGPL/MPL/SSPL/BUSL packages are present. Re-run this audit whenever a new direct dependency is added.
