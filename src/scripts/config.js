MathJax = {
  options: {
    enableMenu: false,
    ignoreHtmlClass: 'ckeditor',
    processHtmlClass: 'tex2jax_process1',
    enableAssistiveMml: true,
    menuOptions: {
      settings: {
        collapsible: false,
        inTabOrder: true,
        explorer: false
      }
    },
  },
  tex: {
    packages: ['base', 'cancel', 'ams']
  },
  loader: {
    load: ['[tex]/cancel']
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
    }
  }
};
