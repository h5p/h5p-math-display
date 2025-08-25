window.MathJax = {
  options: {
    enableMenu: false,
    ignoreHtmlClass: 'ckeditor',
    processHtmlClass: 'tex2jax_process',
    enableHelp: false
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
    }
  }
};
