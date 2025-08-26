/** @namespace H5P */
H5P.MathDisplay = (function () {
  'use strict';
  /**
   * Constructor.
   */
  function MathDisplay() {
    var that = this;

    this.mathjax = undefined;
    this.updating = null;

    // Initialize event inheritance
    H5P.EventDispatcher.call(that);

    /*
     * Initialize MathDisplay if document has loaded and thus H5PIntegration is set.
     * It might be faster to start loading MathJax/the renderer earlier, but in that
     * case we need a mechanism to detect the availability of H5PIntegration for
     * getting the source.
     */
    H5P.jQuery(document).ready(initialize);

    /**
     * Initialize MathDisplay with settings that host may have set in ENV
     */
    function initialize() {
      // Get settings from host
      that.settings = H5P.getLibraryConfig('H5P.MathDisplay');

      if (that.settings.parent !== undefined) {
        console.error('Beep bop! This was disabled since no one knew what it was actually used for @ H5P.MathDisplay');
      }

      // If h5p-container is not set, we're in an editor that may still be loading, hence document
      that.container = that.settings.container || document.getElementsByClassName('h5p-container')[0] || document;

      // Load MathJax dynamically
      const settings = that.settings.renderer && that.settings.renderer.mathjax ? that.settings.renderer.mathjax : null;
      getMathJax(settings);
    }

    /**
     * Get MathJax if available.
     *
     * For MathJax in-line-configuration options cmp.
     * https://docs.mathjax.org/en/latest/configuration.html#using-in-line-configuration-options
     *
     * @param {object} settings - MathJax in-line configuration options.
     */
    function getMathJax(settings) {
      // Add mathjax config before loading actual file
      if (settings && settings.config) {
        MathJax = that.extend(MathJax, settings.config);
      }

      const originalPageReady = MathJax.startup.pageReady;
      MathJax.startup.pageReady = function () {
        originalPageReady.apply(this, arguments);
        that.mathjax = MathJax;
        // Start observer once Mathjax is ready
        that.startMutationObserver();
      }

      const libraryPath = H5P.getLibraryPath('H5P.MathDisplay-1.0');
      MathJax.output = {
        fontPath: libraryPath + '/mathjax-newcm-font'
      };

      // Add MathJax script to document
      var script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = libraryPath + '/mathjax/tex-chtml.js';

      script.async = true;
      document.body.appendChild(script);
    }
  }

  // Extends the event dispatcher
  MathDisplay.prototype = Object.create(H5P.EventDispatcher.prototype);
  MathDisplay.prototype.constructor = MathDisplay;

  /**
   * Start mutation observer.
   */
  MathDisplay.prototype.startMutationObserver = function () {
    var self = this;
    if (!self.container) {
      return;
    }

    self.observer = new MutationObserver(function (mutations) {
      // Filter out elements that have nothing to do with the inner HTML.
      // TODO: There is probably a more efficient way of filtering out only
      // the relevant elements. E.g. Sometime we are actually processing the
      // <span> elements added as part of the MathJax formula here...
      mutations.forEach(mutation => {
        if (mutation.target.textContent.match(/(?:\$|\\\(|\\\[|\\begin\{.*?})/) && !isInsideCKEditor(mutation.target)) {
          self.update(mutation.target);
        }
      });
    });

    self.observer.observe(document.body, {childList: true, subtree: true});
  };

  /**
   * Update the DOM by MathJax.
   */
  MathDisplay.prototype.update = function (target) {
    const self = this;

    if (!self.updating) {
      self.elementsToUpdate = [];
      self.updating = setTimeout(function () {
        try {
          self.mathjax.typesetClear(self.elementsToUpdate); // Remove
          self.mathjax.typesetPromise(self.elementsToUpdate).then(() => self.updateDone()); // Add
        }
        catch (err) {
          console.log('Typeset failed: ' + err.message);
        }
      }, 40);
    }

    // Note that duplicate element trees in the processing queue can lead to strange errors!
    if (self.elementsToUpdate.indexOf(target) === -1 && // No duplicates
        !hasAncestor(target, self.elementsToUpdate)) { // No children of existing elements

      // Ensure none of the existing elements are children of the new target
      for (let i = 0; i < self.elementsToUpdate.length; i++) {
        if (hasAncestor(self.elementsToUpdate[i], [target])) {
          self.elementsToUpdate.splice(i, 1); // Remove element as it exists in the new target's sub elements
          i--;
        }
      }

      // Add target for Mathjax processing
      self.elementsToUpdate.push(target);
    }
  };

  /**
   * Update the DOM by MathJax.
   */
  MathDisplay.prototype.updateDone = function () {
    const self = this;
    self.updating = false;
    for (let i = 0; i < self.elementsToUpdate.length; i++) {
      if (self.elementsToUpdate[i].querySelector('.MathJax, .MathJax_Display') !== null) {
        // We have math, resize the content!
        try {
          H5P.instances[0].trigger('resize'); // TODO: This solution will work today, but a more future proof solution would be to only resize the instance containing the processed elements.
        }
        catch (e) {
          // Do nothing if it fails
        }
        break;
      }
    }
  };

  /**
   * Extend an array just like jQuery's extend.
   * @param {...Object} arguments - Objects to be merged.
   * @return {Object} Merged objects.
   */
  MathDisplay.prototype.extend = function () {
    for (var i = 1; i < arguments.length; i++) {
      for (var key in arguments[i]) {
        if (arguments[i].hasOwnProperty(key)) {
          if (typeof arguments[0][key] === 'object' &&
              typeof arguments[i][key] === 'object') {
            this.extend(arguments[0][key], arguments[i][key]);
          }
          else {
            arguments[0][key] = arguments[i][key];
          }
        }
      }
    }
    return arguments[0];
  };

  /**
   * Determine if any of the ancestors are present for the given element.
   *
   * @param {*} element
   * @param {*} ancestor
   * @returns {Boolean}
   */
  const hasAncestor = (element, potentialAncestors) => {
    if (element.parentElement === null) {
      return false; // This element has no ancestors.
    }
    if (potentialAncestors.indexOf(element.parentElement) !== -1) {
      return true; // This element has one of the ancestors as a parent.
    }
    // Recursion (check grand-parent)
    return hasAncestor(element.parentElement, potentialAncestors);
  };

  /**
   * Determine if the element is a descendant of CKEditor.
   *
   * @param {*} element
   * @returns {Boolean}
   */
  const isInsideCKEditor = (element) => {
    const parent = element.parentElement;
    if (parent === null) {
      return false;
    }
    if (parent.classList.contains('ck')) {
      return true;
    }
    return isInsideCKEditor(parent);
  };

  return MathDisplay;
})();

// Fire up the MathDisplay
new H5P.MathDisplay();
