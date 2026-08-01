module JekyllIndex
  #
  # JekyllIndex::Generator
  #
  class Generator < Jekyll::Generator
    safe true
    priority :low

    def generate(site)
      @site = site

      collection.each do |item|
        doc = create_doc(item)
        unless doc.nil?
          site.posts.docs << doc
        end
      end
      site.site_payload['site']['favicon'] = site.config['jekyll-index']['favicon']
    end

    private

    def create_doc(item)
      doc = Jekyll::Document.new(item[:file], site: @site, collection: @site.collections['posts'])
      hash = YAML.load_file(item[:file])
      doc.content = hash['title'].first['content']
      doc.merge_data! data(item, hash)
      doc
    rescue => e
      Jekyll.logger.warn "Error during processing #{item[:file]}, skipped.", e.message
      nil
    end

    def data(item, hash)
      date = date(hash)
      stage = hash.dig('docstatus', 'stage', 'value') || (date && date['type'])
      yaml_ref = "#{@site.config['jekyll-index']['baseurl']}#{item[:file]}"
      {
        'ref' => reference(item, hash), 'doctype' => hash['doctype'], 'stage' => stage,
        'date' => date_value(date), 'yaml_ref' => yaml_ref
      }
    end

    # `relaton-bib` >= 2.x writes `at`; legacy data files use `value`.
    def date_value(date)
      date && (date['value'] || date['at'])
    end

    def date(hash)
      dates = hash['date'] || []
      dates.find { |d| d['type'] == 'published' } || dates.first
    end

    # Primary docidentifier. `relaton-bib` >= 2.x serializes as
    # `docidentifier` with a `content` field; legacy data files use
    # `docid` with an `id` field. Accept both.
    def primary_docid(hash)
      list = hash['docidentifier'] || hash['docid'] || []
      list.find { |d| d['primary'] }
    end

    def reference(item, hash)
      rendered = render_id(item[:id])
      if @site.config['jekyll-index']['add_type_to_reference']
        primary = primary_docid(hash)
        type = primary && primary['type']
        type ? "#{type} #{rendered}" : rendered
      else
        rendered
      end
    end

    # Render the index :id field. `Relaton::Index` stores it as a Hash for
    # pubid-structured flavors (a `_type:`-tagged, nested pubid serialization).
    # To turn that back into a printable DocID we reconstruct it with a
    # flavor-supplied PubId class and call `to_s`. Flavor selection comes from
    # per-data-repo config, so this plugin stays generic. Reconstruction is
    # wrapped so a single bad row logs a warning and renders a fallback string
    # instead of raising into `create_doc` and dropping the whole document.
    def render_id(id)
      return id if id.is_a?(String)
      return compact_id(id) unless id.is_a?(Hash)

      klass = pubid_class
      return compact_id(id) unless klass

      begin
        reconstruct(klass, id).to_s
      rescue StandardError => e
        fallback = compact_id(id)
        Jekyll.logger.warn "jekyll-index:",
                           "Could not render id #{id.inspect} with #{klass}: " \
                           "#{e.message}. Using fallback #{fallback.inspect}."
        fallback
      end
    end

    # pubid 2.x reconstructs a `_type:`-tagged hash with `from_hash`
    # (a class method taking a positional, String-keyed hash that drives the
    # `_type` subtype and nested `base:` dispatch). Older pubid (1.15.x) uses
    # `create(**symbol_keyed)`. Prefer `from_hash`, since that is the API of the
    # pubid that writes the published `index-v2` files.
    def reconstruct(klass, id)
      if klass.respond_to?(:from_hash)
        klass.from_hash(id)
      elsif klass.respond_to?(:create)
        klass.create(**deep_symbolize(id))
      else
        raise NoMethodError, "#{klass} responds to neither from_hash nor create"
      end
    end

    # Recursively convert String keys to Symbols so the hash can be splatted
    # into `create(**hash)`, which requires Symbol keys. Handles nested Hashes
    # and Hashes inside Arrays (e.g. `base:` and copublisher/part lists).
    def deep_symbolize(obj)
      case obj
      when Hash then obj.each_with_object({}) { |(k, v), h| h[k.to_sym] = deep_symbolize(v) }
      when Array then obj.map { |v| deep_symbolize(v) }
      else obj
      end
    end

    # Readable fallback for a Hash id we can't (or aren't configured to)
    # reconstruct: scalar leaf values joined; degrades to `id.to_s` only if
    # nothing usable is found. Never leaks a raw hash dump into the rendered
    # page. Note: when reconstruction fails for *every* row (e.g. the pubid
    # `from_hash` API drifts), the build still succeeds with fallback strings —
    # each failing row is logged via `Jekyll.logger.warn` in `render_id`.
    def compact_id(obj)
      parts = scalar_values(obj)
      parts.empty? ? obj.to_s : parts.join(" ")
    end

    # Drop only the internal `_type` discriminator (pubid's serialization
    # marker); keep `type` short codes like `amd`/`cor`, which are meaningful
    # parts of the identifier.
    def scalar_values(obj)
      case obj
      when Hash
        obj.reject { |k, _| k.to_s == "_type" }
           .values.flat_map { |v| scalar_values(v) }
      when Array
        obj.flat_map { |v| scalar_values(v) }
      else
        [obj.to_s]
      end
    end

    def pubid_class
      return @pubid_class if defined?(@pubid_class)

      config = @site.config['jekyll-index']
      require config['pubid_require'] if config['pubid_require']
      name = config['pubid_class']
      @pubid_class = name ? Object.const_get(name) : nil
    end

    def collection
      return @collection if defined? @collection

      @collection = index.map do |item|
        item
      end
    end

    def index
      YAML.load_file(@site.config['jekyll-index']['source'])
    end
  end
end
