const distPath = document.currentScript.src.replace(/\/[^/?#]*([?#].*)?$/, ''); // strip filename + ?ver

window.MathJax = {
  loader: {
    paths: {
      tex: `${distPath}/input/tex/extensions`,
       fonts: `${distPath}`,
    },
  },
  chtml: {
    matchFontHeight: true, // True to scale the math to match the ex-height of the surrounding font
    fontURL: `${distPath}/mathjax-newcm-font/chtml/woff2`, // The URL where the fonts are found
    adaptiveCSS: true, // true means only produce CSS that is used in the processed equations
  },
  options: {
    enableMenu: false,
    ignoreHtmlClass: 'ckeditor',
    processHtmlClass: 'tex2jax_process',
    enableExplorer: true,
    enableExplorerHelp: false,
    worker: {
      path: `${distPath}/sre`, // full path to bundle/a11y/sre (set automatically)
      maps: `${distPath}/sre/mathmaps`, // full path to sre's speech rules
      worker: 'speech-worker.js', // name of worker script to load as a webworker
      debug: false, // true to include debugging messages in the browser console about
      //   the communications between the page, worker pool, and workers.
    },
  },
  startup: {
    pageReady: () => MathJax.startup.defaultPageReady().then(() => {
      try {
        H5P.instances[0].trigger('resize');
      }
      catch (e) {
        // Do nothing if it fails
      }
    }),
  },
};
