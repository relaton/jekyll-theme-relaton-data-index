require "jekyll"

# The plugin references `Jekyll::Generator` at load time, so Jekyll must be
# required first.
require_relative "../_plugins/jekyll-index"

RSpec.configure do |config|
  config.disable_monkey_patching!
  config.expect_with(:rspec) { |c| c.syntax = :expect }
  config.mock_with(:rspec) { |c| c.syntax = :expect }
end
