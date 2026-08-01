RSpec.describe JekyllIndex::Generator do
  # Instantiate without Jekyll::Generator#initialize (which wants a config);
  # render_id only needs @site (for pubid_class) which we stub directly.
  subject(:generator) { described_class.allocate }

  # A structured, `_type:`-tagged id with String keys, exactly as the plugin's
  # `YAML.load_file` hands it over from a real `index-v2.yaml` row.
  let(:structured_id) do
    {
      "_type" => "pubid:iso:directives-supplement",
      "year" => "2010",
      "publisher" => "IEC",
      "base" => { "_type" => "pubid:iso:directives", "copublishers" => ["IEC"] },
    }
  end

  # Fake pubid flavor exposing `.from_hash` (the pubid 2.x reconstruction API).
  # Records what it received so we can assert the plugin's dispatch.
  def from_hash_pubid
    Class.new do
      class << self
        attr_accessor :received
        def from_hash(hash)
          self.received = hash
          new(hash)
        end
      end
      def initialize(hash) = @hash = hash
      def to_s = "ISO/IEC DIR IEC SUP #{@hash['year']}"
    end
  end

  # Fake pubid flavor with only `.create(**kwargs)` (the older pubid 1.15.x
  # API). Records the kwargs so we can assert deep-symbolization.
  def create_only_pubid
    Class.new do
      class << self
        attr_accessor :received
        def create(**kwargs)
          self.received = kwargs
          new(kwargs)
        end
      end
      def initialize(kwargs) = @kwargs = kwargs
      def to_s = "CREATE #{@kwargs[:year]}"
    end
  end

  # A fake whose reconstruction always raises, to exercise the rescue path.
  def raising_pubid
    Class.new do
      def self.from_hash(_hash) = raise ArgumentError, "unknown component"
    end
  end

  def use_pubid(klass)
    allow(generator).to receive(:pubid_class).and_return(klass)
    generator.instance_variable_set(:@site,
                                    instance_double("Jekyll::Site",
                                                    config: { "jekyll-index" => {} }))
  end

  describe "#render_id" do
    it "passes a String id through unchanged" do
      use_pubid(from_hash_pubid)
      expect(generator.send(:render_id, "ISO 216")).to eq("ISO 216")
    end

    it "reconstructs a structured id via from_hash (pubid 2.x path)" do
      klass = from_hash_pubid
      use_pubid(klass)

      result = generator.send(:render_id, structured_id)

      expect(klass.received).to eq(structured_id) # String keys, passed as-is
      expect(result).to eq("ISO/IEC DIR IEC SUP 2010")
    end

    it "falls back to create with deep-symbolized keys when from_hash is absent" do
      klass = create_only_pubid
      use_pubid(klass)

      result = generator.send(:render_id, structured_id)

      expect(klass.received.keys).to include(:_type, :year, :publisher, :base)
      expect(klass.received[:base]).to be_a(Hash)
      expect(klass.received[:base].keys).to include(:_type, :copublishers)
      expect(result).to eq("CREATE 2010")
    end

    it "deep-symbolizes hashes nested inside arrays for the create path" do
      klass = create_only_pubid
      use_pubid(klass)

      id = { "parts" => [{ "number" => "1" }, { "number" => "2" }] }
      generator.send(:render_id, id)

      expect(klass.received[:parts]).to all(be_a(Hash))
      expect(klass.received[:parts].map(&:keys)).to eq([[:number], [:number]])
    end

    it "warns and returns a non-hash fallback when reconstruction raises" do
      use_pubid(raising_pubid)

      expect(Jekyll.logger).to receive(:warn)

      result = nil
      expect { result = generator.send(:render_id, structured_id) }.not_to raise_error
      expect(result).to be_a(String)
      expect(result).not_to include("=>") # never a raw hash dump
      expect(result).not_to include("_type")
    end

    it "returns a compact string for a Hash id when no pubid_class is configured" do
      allow(generator).to receive(:pubid_class).and_return(nil)
      generator.instance_variable_set(:@site,
                                      instance_double("Jekyll::Site",
                                                      config: { "jekyll-index" => {} }))

      result = generator.send(:render_id, structured_id)

      expect(result).not_to include("=>")
      expect(result).not_to include("_type")
      expect(result).to include("2010")
    end
  end
end
