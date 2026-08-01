source "https://rubygems.org"

# Jekyll is required to load the `_plugins/jekyll-index.rb` generator (it
# subclasses `Jekyll::Generator`). This mirrors the version the Pages build
# uses (see relaton/support cimas-config .../data/Gemfile.deploy).
gem "jekyll", "~> 4.3"

# Ruby 3.4 dropped csv from the default gems; Jekyll requires it at load time.
gem "csv"

group :test do
  gem "rake", "~> 13.0"
  gem "rspec", "~> 3.13"
end
