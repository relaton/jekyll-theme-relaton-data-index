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

## Test / build commands

```
bundle install
bundle exec rake        # default task: rspec (spec/)
bundle exec rspec
```

Specs are **hermetic** — they stub `pubid_class` with fake doubles, so no (unreleased, git-only)
pubid gem is needed. The real pubid round-trip is verified manually against a real
`relaton-data-iso/index-v2.yaml` (not part of the committed suite, to keep CI off a git gem).
