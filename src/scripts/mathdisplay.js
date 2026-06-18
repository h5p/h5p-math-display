/** @namespace H5P */

class MathDisplay extends H5P.EventDispatcher {
 
  constructor() {
    super();

    this.mathjax = undefined;
    this.updating = null;

    /*
     * Initialize MathDisplay if document has loaded and thus H5PIntegration is set.
     * It might be faster to start loading MathJax/the renderer earlier, but in that
     * case we need a mechanism to detect the availability of H5PIntegration for
     * getting the source.
     */
    H5P.jQuery(document).ready(() => this.initialize());
  }

  /**
   * Initialize MathDisplay with settings that host may have set in ENV
   */
  initialize() {
    // Get settings from host
    this.settings = H5P.getLibraryConfig('H5P.MathDisplay') || {};

    if (this.settings.parent !== undefined) {
      console.error('Beep bop! This was disabled since no one knew what it was actually used for @ H5P.MathDisplay');
    }

    // If h5p-container is not set, we're in an editor that may still be loading, hence document
    this.container = this.settings.container ||
      document.getElementsByClassName('h5p-container')[0] ||
      document;

    // Load MathJax dynamically
    const settings = this.settings.renderer?.mathjax || null;
    this.getMathJax(settings);
  }

  /**
   * Get MathJax if available.
     *
     * For MathJax in-line-configuration options cmp.
     * https://docs.mathjax.org/en/latest/configuration.html#using-in-line-configuration-options
   *
   * @param {object} settings - MathJax in-line configuration options.
   */
  getMathJax(settings) {
    // Add mathjax config before loading actual file
    if (settings && settings.config) {
      MathJax = this.extend(MathJax, settings.config);
    }
    
    const self = this;
    const originalPageReady = MathJax.startup.pageReady;
      MathJax.startup.pageReady = function () {
        originalPageReady.apply(this, arguments);
        self.mathjax = MathJax;
        // Start observer once Mathjax is ready
        self.startMutationObserver();
    };

    // Add MathJax script to document
    const script = document.createElement('script');
    script.type = 'text/javascript';

    const libraryPath = H5P.getLibraryPath('H5P.MathDisplay-1.0');

    script.src = `${libraryPath}/dist/mathjax.js`;
    script.async = true;

    document.body.appendChild(script);
  }

  /**
   * Start mutation observer.
   */
  startMutationObserver() {
    if (!this.container) {
      return;
    }

    this.observer = new MutationObserver((mutations) => {
      // Filter out elements that have nothing to do with the inner HTML.
      // TODO: There is probably a more efficient way of filtering out only
      // the relevant elements. E.g. Sometime we are actually processing the
      // <span> elements added as part of the MathJax formula here...
      mutations.forEach((mutation) => {
        if (
          mutation.target.textContent.match(/(?:\$|\\\(|\\\[|\\begin\{.*?})/) &&
          !isInsideCKEditor(mutation.target)
        ) {
          this.update(mutation.target);
        }
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Update the DOM by MathJax.
   */
  update(target) {
    if (!this.updating) {
      this.elementsToUpdate = [];

      this.updating = setTimeout(() => {
        try {
          this.mathjax.typesetClear(this.elementsToUpdate);
          this.mathjax.typesetPromise(this.elementsToUpdate)
            .then(() => this.updateDone());
        }
        catch (err) {
          console.log(`Typeset failed: ${err.message}`);
        }
      }, 40);
    }

    // Note that duplicate element trees in the processing queue can lead to strange errors!
    if (this.elementsToUpdate.indexOf(target) === -1 && // No duplicates
        !hasAncestor(target, this.elementsToUpdate)) { // No children of existing elements

      // Ensure none of the existing elements are children of the new target
      for (let i = 0; i < this.elementsToUpdate.length; i++) {
        if (hasAncestor(this.elementsToUpdate[i], [target])) {
          this.elementsToUpdate.splice(i, 1); // Remove element as it exists in the new target's sub elements
          i--;
        }
      }

      // Add target for Mathjax processing
      this.elementsToUpdate.push(target);
    }
  }

  /**
   * Update the DOM by MathJax.
   */
  updateDone() {
    this.updating = false;

    for (let i = 0; i < this.elementsToUpdate.length; i++) {
      if (
        this.elementsToUpdate[i].querySelector('.MathJax, .MathJax_Display') !== null
      ) {
        // We have math, resize the content!
        try {
          H5P.instances[0].trigger('resize');
        }
        catch (e) {
          // Do nothing if it fails
        }

        break;
      }
    }
  }

  /**
   * Extend an array just like jQuery's extend.
   *
   * @return {Object} Merged objects.
   */
  extend() {
    for (let i = 1; i < arguments.length; i++) {
      for (const key in arguments[i]) {
        if (arguments[i].hasOwnProperty(key)) {
          if (
            typeof arguments[0][key] === 'object' &&
            typeof arguments[i][key] === 'object'
          ) {
            this.extend(arguments[0][key], arguments[i][key]);
          }
          else {
            arguments[0][key] = arguments[i][key];
          }
        }
      }
    }

    return arguments[0];
  }
}

/**
 * Determine if any of the ancestors are present for the given element.
 *
 * @param {*} element
 * @param {*} ancestor
 * @returns {Boolean}
 */
const hasAncestor = (element, potentialAncestors) => {
  if (element.parentElement === null) {
    return false;
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


export default MathDisplay;