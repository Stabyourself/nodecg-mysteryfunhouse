# Vue 3 migration notes

Done on 2026-10-01: Vue 2.7 → 3.5, Vuetify 2 → 4, laravel-mix/webpack → Vite 8. These are
the things that are not obvious from the code.

## How it is put together now

- `build.mjs` runs two Vite builds (`vite.config.mjs`, `--mode graphics` and
  `--mode dashboard`) and compiles `src/scss/style.scss` and `mt20.scss` with sass.
- Each build is a single classic script (`dist/js/main.js`, `dist/js/dashboard.js`) with its
  css inside, so the pages load one `<script>` and nothing else changed about them.
- The pages still put their root component tag inside `<div id="app">`, which is why `vue` is
  aliased to the build that includes the template compiler.
- Only the dashboard build has Vuetify. Sass settings for it are in
  `src/scss/vuetify-settings.scss`, global tweaks in `src/scss/dashboard.scss`.

## The graphics do not use Vuetify any more

The layouts were written inside Vuetify 2's `<v-app>` and silently depended on its css reset,
utility classes (`d-flex`, `mb-3`, ...) and the timeline in `PlayerPath`. Vuetify 4 changes
all of that, so instead of upgrading it there:

- `components/GraphicApp.vue` renders the same wrapper markup `<v-app>` did.
- `src/scss/graphics-legacy.css` is the part of Vuetify 2.7.2's stylesheet the graphics
  actually use, extracted from the styles it injected. It is frozen on purpose.
- `PlayerPath.vue` and the icons in the MT18/MT19 player boxes use the markup Vuetify used to
  render, styled by that file.

If a graphic needs another old utility class, add the rule to `graphics-legacy.css`.

## Vue 3 differences that matter here

- **`bindReplicant` watches deeply.** Vue 3 does not notify a plain watcher when an array is
  changed in place (`crop[i] = ...`), so the watcher in `util.js` is `deep`. The flip side:
  changing a bound array/object in place now always goes to the replicant, so sort or
  reverse a copy (see `ImageSelector` and `AllCards`).
- **Slotted content is not styled by the host's scoped css** unless the selector is wrapped
  in `:slotted()` (see `MT17GameBox`).
- **Objects from other libraries go in `markRaw()`** before they are stored in `data`
  (the Twitch player in `TwitchPlayer` / `PlayerOnly`).
- Lifecycle hooks are `beforeUnmount` / `unmounted`, `this.$set` is gone, transition classes
  are `-enter-from` instead of `-enter`, `::v-deep x` is `:deep(x)`.

## Vuetify 4 in the dashboard

The panels keep Vuetify 4's own look. Deliberate deviations:

- text inputs use the `underlined` variant (set as defaults in `src/js/vuetify.js`);
- the grid gutter is 12px instead of 24px, with the row densities scaled to match;
- disabled coloured buttons are greyed out, links use the primary colour.

Most prop renames are mechanical (`dense` → `density="compact"`, `small` → `size="small"`,
`outlined`/`text` → `variant`, `item-text` → `item-title`, `:value` → `:model-value`,
activator slots give `{ props }`).

## Checking a change

Before/after comparisons were done by loading every graphic and panel from the running
NodeCG in a headless browser and comparing element positions, sizes and computed styles.
All 24 graphics measured identical to the Vue 2 build. A layout that looks off after a change
is most likely a rule missing from `graphics-legacy.css`.
