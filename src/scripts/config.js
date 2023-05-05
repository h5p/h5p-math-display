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
        collapsible: false,
        inTabOrder: true,
        explorer: false,
      }
    },
  },
  loader: {
    load: ['a11y/semantic-enrich']
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
      const {CHTMLFontData} = MathJax._.output.chtml.FontData;
      const addFontURLs = CHTMLFontData.prototype.addFontURLs;
      CHTMLFontData.prototype.addFontURLs = (styles, fonts, url) => {
        url = url.split('output');
        url = url[0]+'fonts';
        for (const name of Object.keys(fonts)) {
          const font = {...fonts[name]};
          font.src = font.src.replace(/%%URL%%/, url);
          styles[name] = font;
        }
        if (url !== false) {
          addFontURLs.call(this, styles, fonts, url);
        }
      }
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
