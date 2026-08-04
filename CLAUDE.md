# jekyll-theme-relaton-data-index

Jekyll theme + plugin that renders the "data index" GitHub Pages site for each
`relaton-data-*` repo. The shared deploy workflow (`relaton/support`
`.github/workflows/data-deploy.yml`) checks this theme out into `src/`, merges the
data repo's `_config.yml` over the base `_config.yml`, and runs `jekyll build`.

## The plugin

`_plugins/jekyll-index.rb` (`JekyllIndex::Generator`) reads the index file named by
`jekyll-index.source`, and for each `{ :id, :file }` row builds a Jekyll document whose
`ref` is the rendered identifier.

### Index id rendering (`render_id`) — version-sensitive contract

An index `:id` is either a plain String (string-id flavors) or a Hash. For
**pubid-structured** flavors (16 v2/v3 flavors: adobe, ccsds, cie, easc, etsi, gost, iec,
ieee, iho, iso, itu-r, jcgm, jis, nist, oiml, plateau) the Hash is a `_type:`-tagged, nested
pubid serialization with **String keys** (only the top-level `:id`/`:file` are symbols, because
the index is loaded with plain `YAML.load_file`).

Reconstruction is done by a flavor-supplied pubid class, configured per data repo via
`jekyll-index.pubid_class` (+ `pubid_require`), which the plugin resolves with
`Object.const_get`. The reconstruction API is **version-dependent**:

- **pubid 2.x** (the version that *writes* `index-v2`/`v3`): `Klass.from_hash(hash)` — a class
  method taking a **positional, String-keyed** hash; it drives `_type` subtype + nested `base:`
  dispatch. This is the preferred path.
- **pubid 1.15.x** (legacy): `Klass.create(**symbol_keyed_hash)`. Requires Symbol keys, so the
  plugin deep-symbolizes first. This cannot reconstruct `_type` structured ids.

`render_id` prefers `from_hash`, falls back to `create`, and on any failure logs
`Jekyll.logger.warn` and renders a `compact_id` fallback string (scalar leaves joined) so a bad
row never empties the page. **Build-environment note:** correct DocIDs require the flavor's pubid
gem in the `jekyll build` bundle — see `/work/HANDOFFS/relaton__support__data-deploy-gemfile-pubid.md`.

## Theme chrome

The theme mirrors the design system of https://www.relaton.org, which is a **VitePress site**
(`relaton/relaton.org`, `.vitepress/theme/custom.css` — the upstream source of truth for every
token below). There is no Materialize and no gradient chrome any more; the whole stylesheet is
hand-written in `_sass/style.scss` (~14 KB built).

- **Tokens.** `:root` / `.dark` custom properties copied from relaton.org: brand `#1f6cf1`,
  accent `#21c197`, light surfaces `#ffffff`/`#f8fafb`/`#f1f4f7`, dark surfaces
  `#0b0f13`/`#111820`/`#171f28`, text `#1c2126`/`#3d4854`/`#64748b` (dark:
  `#e8ecf0`/`#a0aebe`/`#5f7082`), dividers `#e2e8f0`/`#1e2a36`. Content is capped at 1152px,
  the nav at 1376px — both relaton.org's widths.
- **Type.** Outfit (400/500/600/700) for the UI, JetBrains Mono for DocIDs. Quicksand is retired.
- **Chrome.** `header.html` is relaton.org's `.VPNav`: sticky, translucent, `backdrop-filter`
  blurred, with the blue swirl-R `symbol.svg` (copied verbatim from relaton.org's
  `public/logo-light.svg` — blue in *both* appearances, do not force it white), the flavor chip,
  nav links back to relaton.org, the appearance switch and the GitHub mark.
  `footer.html` is a port of relaton.org's `SiteFooter.vue`.
- **Appearance.** Light/dark keys off a `.dark` class on `<html>`, VitePress-style. The inline
  snippet in `head.html` resolves it **before first paint** (localStorage key
  `relaton-appearance`, values `auto`/`light`/`dark`); `assets/js/appearance.js` only wires the
  toggle. Any new dark rule must hang off `.dark`.
- The `$doctype-colors-list` / `$docstage-colors-list` maps are **semantic category colors, not
  brand chrome** — leave the hues alone. They are rendered as soft badges via `color-mix()`, with
  `--badge-*-mix` flipping the tint direction per appearance.

**Row-markup parity invariant:** the per-document `.doc-row` markup in `index.html`'s
`{% for post in paginator.posts %}` loop (server-rendered) is duplicated by
`assets/js/search.js` `renderRow()` (the client-side filtered view), and `_includes/pager.html`
is duplicated by `renderPager()`. Any change to one **must** be mirrored in the other or the two
views diverge. `spec/brand_chrome_spec.rb` is a hermetic (file-read, no build) guard for both
couplings and for the design tokens.

## Test / build commands

```
bundle install
bundle exec rake        # default task: rspec (spec/)
bundle exec rspec
```

Specs are **hermetic** — they stub `pubid_class` with fake doubles, so no (unreleased, git-only)
pubid gem is needed. The real pubid round-trip is verified manually against a real
`relaton-data-iso/index-v2.yaml` (not part of the committed suite, to keep CI off a git gem).
