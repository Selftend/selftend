# Licensing

## Chosen project license

Default project license: `AGPL-3.0-only`

Reason:

- this project is intended to be open-source
- it is expected to have a public web-delivered experience, not just downloadable mobile binaries
- AGPL is stronger than GPL for keeping hosted derivatives open

## What this means in practice

- code contributions are expected to be compatible with AGPL-3.0-only
- anyone contributing should understand that the repository is not permissively licensed
- hosted modifications should not become a loophole for taking the work private

## Reference repository rules

This repo may learn from:

- `../ifme`
- `../quirk`
- `../awesome-mental-health`

But learning from a repo is not the same as copying from it.

Rules:

- ideas and patterns may be studied freely
- copied code requires license review and attribution
- copied text, content, or assets require even stricter review
- do not copy screenshots, educational content, icons, or brand assets casually

## Specific reference notes

### if-me

- if-me is AGPL-3.0
- that makes it closer in spirit to this project's outbound license choice
- even so, copied code or content should still be tracked and attributed

### Quirk

- Quirk is GPL-3.0
- treat it as a design and product-flow reference first
- do not move Quirk code into this repo without explicit review of compatibility, attribution, and maintenance consequences

### awesome-mental-health

- awesome-mental-health is CC0-1.0
- treat it as a curated reference list for resource discovery and competitive scanning, not as a product codebase
- if it leads to a third-party resource, app, or text excerpt, track that downstream source separately instead of treating the list entry as the only attribution requirement

## Third-party content and asset rule

For any borrowed third-party material, keep a record of:

- source
- license
- attribution requirement
- whether it was copied, adapted, or only used for inspiration

## Third-party UI component layer

The app now uses default React Native Reusables-generated components in `src/components/react-native-reusables`.

License posture:

- React Native Reusables is MIT licensed.
- Generated component code may be used in a free non-profit app, but the project must preserve the relevant copyright and license notices.
- Non-profit status does not remove open-source license obligations.
- The Reusables CLI states that it uses code from `shadcn/ui`, also under MIT; keep this in the notice trail.
- Support dependencies added for the UI layer are permissive or compatible licenses as checked from installed package metadata on 2026-05-03:
  - `@rn-primitives/*` direct packages used by the generated component set: MIT
  - `class-variance-authority`: Apache-2.0
  - `clsx`, `tailwind-merge`, `tailwindcss-animate`: MIT
  - `lucide-react-native`: ISC

Current notice tracking lives in [.github/THIRD_PARTY_NOTICES.md](../.github/THIRD_PARTY_NOTICES.md). Before public launch, replace the lightweight notice file with a complete dependency notice/export process if app-store or legal review requires it.

## Contributor rule

If you open a PR, assume the contribution is offered under this repository's license unless the project later adopts an explicit contributor license agreement or developer certificate of origin workflow.

## Important caveat

This file is planning guidance, not legal advice. Before a public launch, get a real legal review for:

- AGPL posture
- public hosting obligations
- minors / future under-18 expansion
- privacy and data retention
- crisis and safety copy
