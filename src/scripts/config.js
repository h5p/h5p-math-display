MathJax = {
  options: {
    enableMenu: false,
    ignoreHtmlClass: 'ckeditor',
    processHtmlClass: 'tex2jax_process',
    renderActions: {
      enrich: {'[+]': [
        function (doc) {doc.enrich(true)},
        function (math, doc) {math.enrich(doc, true)}
      ]}
    },
    menuOptions: {
      settings: {
        assistiveMml: true,
        collapsible: false,
        inTabOrder: false,
        explorer: false,
      }
    },
    sre: {
      speech: 'shallow',        // or 'deep', or 'none'
      domain: 'clearspeak',    // speech rules domain
      style: 'default',       // speech rules style
      locale: document.documentElement.lang // the language to use (en, fr, es, de, it)
    },
  },
  loader: {
    load: ['a11y/semantic-enrich', 'a11y/assistive-mml']
  },
  tex: {
        packages: {'[+]': ['fix-unicode']}
  },
  startup: {
    pageReady: () => {
      return MathJax.startup.defaultPageReady().then(() => {
        try {
          H5P.instances[0].trigger('resize');
        }
        catch (e) {
          // Do nothing if it fails
        }
      });
    },
    ready() {
      const { CHTMLFontData } = MathJax._.output.chtml.FontData;
      const addFontURLs = CHTMLFontData.prototype.addFontURLs;
      const { Configuration } = MathJax._.input.tex.Configuration;
      const { MapHandler } = MathJax._.input.tex.MapHandler;
      const NodeUtil = MathJax._.input.tex.NodeUtil.default;
      const { getRange } = MathJax._.core.MmlTree.OperatorDictionary;

      CHTMLFontData.prototype.addFontURLs = (styles, fonts, url) => {
        url = url.split('output');
        url = url[0]+'fonts';
        for (const name of Object.keys(fonts)) {
          const font = { ...fonts[name] };
          font.src = font.src.replace(/%%URL%%/, url);
          styles[name] = font;
        }
        if (url !== false) {
          addFontURLs.call(this, styles, fonts, url);
        }
      };

      function Other(parser, char) {
        const font = parser.stack.env['font'];
        let def = font ? { mathvariant: parser.stack.env['font'] } : {};
        const remap = MapHandler.getMap('remap').lookup(char);
        const range = getRange(char);
        const type = range?.[3] || 'mo';
        let mo = parser.create('token', type, def, remap ? remap.char : char);
        range?.[4] && mo.attributes.set('mathvariant', range[4]);
        if (type === 'mo') {
          NodeUtil.setProperty(mo, 'fixStretchy', true);
          parser.configuration.addNode('fixStretchy', mo);
        }
        parser.Push(mo);
      }

      Configuration.create('fix-unicode', { fallback: { character: Other } });
      MathJax.startup.defaultReady();

      // MathJax 3.x doesn't support \\ linebreaks. Wrapping in \displaylines{} fixes this
      // and ensures compatibility with equations using this instead of other semantic
      // grouping functions.
      MathJax.startup.document.inputJax[0].preFilters.add(({math}) => {
        math.math = '\\displaylines{' + math.math + '}'; // math = https://github.com/mathjax/MathJax-src/blob/master/ts/core/MathItem.ts
      });
    }
  }
};
