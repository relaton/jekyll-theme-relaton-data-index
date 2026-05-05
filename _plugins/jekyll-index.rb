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
      stage = hash.dig('docstatus', 'stage', 'value') || date['type']
      yaml_ref = "#{@site.config['jekyll-index']['baseurl']}#{item[:file]}"
      {
        'ref' => reference(item, hash), 'doctype' => hash['doctype'], 'stage' => stage, 'date' => date['value'],
        'yaml_ref' => yaml_ref
      }
    end

    def date(hash)
      hash['date'].find { |d| d['type'] == 'published' } || hash['date'].first
    end

    def reference(item, hash)
      rendered = render_id(item[:id])
      if @site.config['jekyll-index']['add_type_to_reference']
        type = hash['docid'].find { |id| id['primary'] }['type']
        "#{type} #{rendered}"
      else
        rendered
      end
    end

    # Render the index :id field. `Relaton::Index` stores it as a Hash for
    # flavors that key the index by parts (e.g. relaton-w3c). To turn that
    # back into a printable identifier we instantiate a flavor-supplied
    # PubId class and call `to_s`. Flavor selection comes from per-data-repo
    # config, so this plugin stays generic.
    def render_id(id)
      return id if id.is_a?(String)
      return id.to_s unless id.is_a?(Hash)

      klass = pubid_class
      klass ? klass.new(**id).to_s : id.to_s
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
