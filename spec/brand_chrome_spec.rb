require "spec_helper"

# Hermetic guards for the brand-align restyle. No Jekyll build is run: these
# assert on the raw source of the theme's chrome so a future edit can't silently
# desync the two copy-icon renderings or reintroduce the retired deep-purple
# accent.
RSpec.describe "brand chrome" do
  root = File.expand_path("..", __dir__)

  index_html = File.read(File.join(root, "index.html"))
  search_js  = File.read(File.join(root, "assets", "js", "search.js"))

  describe "copy-reference icon" do
    it "uses the .copy-reference class in the server-rendered index" do
      expect(index_html).to include("copy-reference")
    end

    it "uses the same .copy-reference class in the JS-rendered rows" do
      expect(search_js).to include("copy-reference")
    end

    it "drops the retired Materialize deep-purple color classes in both views" do
      # index.html and search.js#renderRow render the same row markup; if one
      # keeps the old deep-purple classes the filtered view diverges from the
      # static one.
      expect(index_html).not_to include("deep-purple")
      expect(search_js).not_to include("deep-purple")
    end
  end

  describe "brand palette" do
    style_scss = File.read(File.join(root, "_sass", "style.scss"))

    it "no longer hardcodes the deep-purple accent (#7e57c2)" do
      expect(style_scss).not_to match(/#7e57c2/i)
    end

    it "uses the relaton.org brand gradient for the header/footer chrome" do
      expect(style_scss).to include("linear-gradient(135deg, #1f6cf1 0%, #21c197 100%)")
    end
  end
end
