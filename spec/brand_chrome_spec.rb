require "spec_helper"

# Hermetic guards for the relaton.org-aligned chrome. No Jekyll build is run:
# these assert on the raw source of the theme's chrome so a future edit can't
# silently desync the two row renderings or drift off the shared design tokens.
RSpec.describe "brand chrome" do
  root = File.expand_path("..", __dir__)

  index_html = File.read(File.join(root, "index.html"))
  search_js  = File.read(File.join(root, "assets", "js", "search.js"))
  style_scss = File.read(File.join(root, "_sass", "style.scss"))
  head_html  = File.read(File.join(root, "_includes", "head.html"))

  # index.html and search.js#renderRow render the same row markup; if one drifts
  # the client-side filtered view diverges from the static one.
  describe "row markup parity" do
    %w[doc-row doc-main doc-id-line reference copy-reference doc-title
       doc-meta doc-type doc-stage doc-date doc-yaml].each do |klass|
      it "renders .#{klass} in both the server- and JS-rendered rows" do
        expect(index_html).to include(klass)
        expect(search_js).to include(klass)
      end
    end

    it "wraps the JS-rendered rows in the same .doc-list container" do
      expect(index_html).to include(%(<div class="doc-list">))
      expect(search_js).to include(%('<div class="doc-list">'))
    end

    it "drops the retired Materialize grid and icon-font markup in both views" do
      [index_html, search_js].each do |source|
        expect(source).not_to include("deep-purple")
        expect(source).not_to include("material-icons")
        expect(source).not_to include("col s12")
      end
    end
  end

  # Pagination is likewise rendered twice — _includes/pager.html server-side,
  # search.js#renderPager for the filtered view.
  describe "pager markup parity" do
    pager_html = File.read(File.join(root, "_includes", "pager.html"))

    %w[pager pager-item active disabled].each do |klass|
      it "renders .#{klass} in both pagers" do
        expect(pager_html).to include(klass)
        expect(search_js).to include(klass)
      end
    end
  end

  describe "design tokens" do
    it "uses relaton.org's brand blue and teal accent" do
      expect(style_scss).to match(/--c-brand-1:\s*#1f6cf1/i)
      expect(style_scss).to match(/--c-accent:\s*#21c197/i)
    end

    it "ships relaton.org's light and dark surface/text scales" do
      # Light (:root) and dark (.dark) both come from
      # relaton/relaton.org .vitepress/theme/custom.css.
      expect(style_scss).to match(/--c-bg:\s*#ffffff/i)
      expect(style_scss).to match(/--c-text-1:\s*#1c2126/i)
      expect(style_scss).to match(/--c-bg:\s*#0b0f13/i)
      expect(style_scss).to match(/--c-text-1:\s*#e8ecf0/i)
    end

    it "no longer hardcodes the retired deep-purple accent (#7e57c2)" do
      expect(style_scss).not_to match(/#7e57c2/i)
    end

    it "uses Outfit, relaton.org's typeface" do
      expect(style_scss).to match(/--font-base:\s*"Outfit"/)
      expect(head_html).to include("family=Outfit")
    end
  end

  describe "appearance switching" do
    it "resolves the appearance before first paint to avoid a white flash" do
      expect(head_html).to include("relaton-appearance")
      expect(head_html).to include("prefers-color-scheme: dark")
    end

    it "keys every dark-mode rule off the same .dark class the head script sets" do
      expect(head_html).to include("classList.add('dark')")
      expect(style_scss).to match(/^\.dark \{/)
    end
  end
end
