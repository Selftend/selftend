# ADR-0006: The panel may duplicate a fixed door, it may not mirror a collection

Date: 2026-09-07 · Status: accepted · Origin: #2085 (decision; map #2083, from
the owner's line _"now that home contains all tools and modules, you can remove
them from the sidebar"_; #2088 refused favourites in every shape) · Recorded by:
#2107, after #2106 shipped the panel

## Context

The navigation panel (`src/components/app/sidebar-nav.tsx`) is the app's only
navigation chrome on every platform — there is no desktop rail (#667), and
`AppShell` mounts it only inside the navigation overlay. Until #2106 it listed
the whole product: three top rows, then a **Tools** group of eight under its own
heading, then a **Modules** group of three — tools above modules by #1823, so
the panel and Home agreed on the order of encounter — with a row at the end of
each group opening that group's hub (#1841), and the account rows and Donate
below a divider.

Home had meanwhile become the surface that carries the catalogue.
`today-screen.tsx` renders all eleven items unconditionally, drawn from the one
catalogue in `src/features/favorites/items.ts` — the `TOOLS` and `MODULES`
constants that `CATALOGUE` concatenates — with a Favourites section above them.
So the eleven panel rows were a **second list of the same items**, written
by hand as a `NavItemDef[]` and free to disagree with the first — and, because
starring is a gesture on a card and the panel has no cards, a copy that could be
read but not changed.

That is the shape this decision is about. The question it had to answer was not
"does the panel hold too much" but "what is the panel for at all".

## Decision

**The panel may duplicate a fixed door. It may not mirror a collection.**

Home is the doing; **the panel is everything around the doing** — the record
(Looking back), the plans (Routines), the reminders, and the account. It is not
a cross-app index. The panel is seven rows and no group headings: Home, Looking
back, Routines · divider · Reminders, Settings, Support, Donate.

Both halves of the line are load-bearing:

- **A fixed door may be duplicated.** The Home row stays, and Settings and
  Support stay even though `UserMenu` — which `InvisibleHeader` mounts on every
  screen — already carries both. A fixed row cannot drift out of agreement with
  anything, and it is nobody's lesser copy.
- **A collection may not be mirrored.** The cost of the eleven catalogue rows
  was **drift plus lesser-copy**. Both halves rest on there being a second,
  hand-maintained list. Neither rests on how many rows the panel has.

Do not read this as "the panel drops anything with a second door". It drops
mirrored collections.

### Tool-to-tool reach was weighed and given up

The panel was the only way to leave one tool for another without passing through
a hub or Home. That reach is surrendered deliberately, on
`docs/product-principles.md` §12 (_Fulfilling, And Done_) and
[ADR-0004](0004-retention-by-return-not-engagement.md): **chaining tools
optimises session length**, which is the variable the retention boundary refuses
to optimise. A tool that ends should be allowed to end.

It costs no taps. `InvisibleHeader`'s centre brand is a `Link` to the app root on
every screen, so Home is one tap from anywhere, and a panel row and a Home card
are both two taps from any screen. What changes is scanning cost, not reach.

## Alternatives considered

- **Keep the rows; let the panel be an index of the app.** Refused: that is the
  mirrored collection, and the drift is what makes it expensive.
- **Shorten the panel instead — keep some catalogue rows and drop others.**
  Refused, and this is the reasoning most worth keeping, because it is the one a
  later reader will try to reopen. **The argument was never length.** Length
  was tested and rejected outright: Looking back and Routines are rows 2 and 3,
  and Settings and Support each have a second door in `UserMenu`, so the only
  genuinely buried _unique_ row was Reminders. An argument resting on length
  evaporates the moment the panel is shortened for some other reason — and this
  change shortens it. The rule therefore has to be stated in terms of drift and
  lesser-copy, which do not move with the row count.
- **A Favourites block in the panel** (#2088, ruled from a four-shape
  prototype). Refused in **every** shape, including the one that survived the
  principle above. A single fixed `Favourites` row opening Home's strip is a
  duplicated _fixed_ door, which this decision permits — it lost on **cost**:
  Home is one tap away and Favourites is its first section, so the row buys a
  scroll rather than a tap. Its icon-strip variation will be re-proposed, and
  it is the mirrored-collection shape in disguise: per-person items, an order it
  has to choose, unstarrable where it is shown, and icon-only makes the glyph
  ambiguous — the panel's own icon set gave `anchor` to Grounding and to DBT
  alike. The "it is a view of the same constant, so there is nothing to
  drift" defence that once covered Favourites **expired the same day**: #2091
  gave it `starred-at, newest first`, an ordering rule no other surface shares,
  so a panel copy would be a hand-maintained agreement between two independently
  ordered lists.
- **A contextual "you are here" row.** Refused: `ScreenBreadcrumb` sits in the
  shared chrome (`screen-header.tsx`, `screen-top-bar.tsx`,
  `module-home-header.tsx`), so a tool or module screen carrying that chrome
  already says where it is without anything being opened. The exception proves
  the rule rather than undoing it: a focus session deliberately carries no
  breadcrumb, and a panel row would not have been welcome there either.

## Consequences

- `CONTEXT.md` § _Navigation_ defines **Panel** and carries the governing line;
  the reasoning behind it lives here.
- The panel's unique payload is now Looking back (`/progress`), Routines
  (`/routines`) and Reminders (`/notifications`) — reachable from nowhere else
  in the app — plus the outbound Donate row. That is what the drawer earns its
  existence on. Rationalising the Settings and Support overlap with `UserMenu`
  is knowingly out of scope.
- The principle binds **the panel**, not the app's screens. A screen that slices
  the same constant is a view, not a mirror.
- What is refused here is refused rather than deferred: a catalogue in the
  panel, a favourites block in it in any shape, and any row that changes with
  where the user is.
