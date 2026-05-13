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
- `lucide-react-native`: ISC
- `react-easy-crop`: MIT
- `tailwind-merge`: MIT
- `tailwindcss-animate`: MIT

Before public launch, run a complete dependency license review and replace this lightweight file if legal or app-store review requires a fuller notice process.
