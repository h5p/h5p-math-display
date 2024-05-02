/** @namespace H5P */
H5P.MathDisplay = (function () {
  'use strict';
  /**
   * Constructor.
   */
  function MathDisplay() {
    var that = this;

    this.isReady = false;
    this.mathjax = undefined;
    this.observer = undefined;
    this.updating = null;
    this.mathHasBeenAdded = false;

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

      // Set default observers if none configured. Will need tweaking.
      if (!that.settings.observers || that.settings.observers.length === 0) {
        that.settings = that.extend({
          observers: [
            {name: 'mutationObserver', params: {cooldown: 500}},
            {name: 'domChangedListener'},
            //{name: 'interval', params: {time: 1000}},
          ]
        }, that.settings);
      }

      if (that.settings.parent !== undefined) {
        console.error('Beep bop! This was disabled since no one knew what it was actually used for @ H5P.MathDisplay');
      }

      // If h5p-container is not set, we're in an editor that may still be loading, hence document
      that.container = that.settings.container || document.getElementsByClassName('h5p-container')[0] || document;

      // Load MathJax dynamically
      const settings = that.settings.renderer && that.settings.renderer.mathjax ? that.settings.renderer.mathjax : null;
      getMathJax(settings);


      // Update math content and resize
      that.update();
    }

    /**
     * Start observers.
     *
     * @param {object[]} observers - Observers to be used.
     */
    function startObservers(observers) {
      // Start observers
      observers.forEach(function (observer) {
        switch (observer.name) {
          case 'mutationObserver':
            that.startMutationObserver(observer.params);
            break;
          case 'domChangedListener':
            that.startDOMChangedListener(observer.params);
            break;
          case 'interval':
            that.startIntervalUpdater(observer.params);
            break;
        }
      });
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

      // Add MathJax script to document
      var script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = H5P.getLibraryPath('H5P.MathDisplay-1.0')+'/dist/mathjax.js';
      script.async = true;
      script.onload = function () {
        that.mathjax = MathJax; // TODO: How do we know this is the right one? Is this there any reason for having this? AFAIK there can only be one loaded and used per page.
        startObservers(that.settings.observers);
        // MathDisplay is ready
        that.isReady = true;
      };
      document.body.appendChild(script);
    }
  }

  // Extends the event dispatcher
  MathDisplay.prototype = Object.create(H5P.EventDispatcher.prototype);
  MathDisplay.prototype.constructor = MathDisplay;

  /**
   * Start domChangedListener.
   *
   * @param {object} params - Parameters. Currently not used.
   * @return {boolean} True if observer could be started, else false.
   */
  MathDisplay.prototype.startDOMChangedListener = function () {
    var that = this;
    H5P.externalDispatcher.on('domChanged', function (event) {
      that.update();
    });
    return true;
  };

  /**
   * Start interval updater.
   *
   * @param {object} params - Parameters.
   * @param {number} params.time - Interval time.
   * @return {boolean} True if observer could be started, else false.
   */
  MathDisplay.prototype.startIntervalUpdater = function (params) {
    var that = this;

    if (!params || !params.time) {
      return false;
    }

    /**
     * Update math display in regular intervals.
     *
     * @param {number} time - Interval time.
     */
    function intervalUpdate(time) {
      setTimeout(function () {
        that.update();
        intervalUpdate(time);
      }, time);
    }

    intervalUpdate(params.time);

    return true;
  };

  /**
   * Start mutation observer.
   *
   * @param {object} params - Paremeters.
   * @param {number} params.cooldown - Cooldown period.
   * @return {boolean} True if observer could be started, else false.
   */
  MathDisplay.prototype.startMutationObserver = function (params) {
    var that = this;

    if (!this.container) {
      return false;
    }

    this.mutationCoolingPeriod = params.cooldown;

    this.observer = new MutationObserver(function (mutations) {
      if (includesMathJaxAdded(mutations)) {
        // We are only resize the content if MathJax was actually added as
        // constant resizing of the entire content is quite expensive.
        that.mathHasBeenAdded = true;
      }

      // Filter out elements that have nothing to do with the inner HTML.
      // TODO: There is probably a more efficient way of filtering out only
      // the relevant elements. E.g. Sometime we are actually processing the
      // <span> elements added as part of the MathJax formula here...
      mutations
        .filter(function (mutation) {
          return mutation.target.textContent.match(/(?:\$|\\\(|\\\[|\\begin\{.*?})/);
        })
        .forEach(function () {
          that.update();
        });
    });

    this.observer.observe(this.container, {childList: true, subtree: true});
    return true;
  };

  /**
   * Update the DOM by MathJax.
   */
  MathDisplay.prototype.update = function () {
    const self = this;
    let promise = Promise.resolve();
    if (!this.isReady) {
      return;
    }

    // TODO: There is really no need to call update() until the H5P instance's
    // attach() has finished running.(MathJax should probably attach on an
    // instance level instead of the entire page?)
    // There seems to be a bit of redundant processing going on.

    /**
     * Triggered when MathJax has finished rendering
     */
    const callback = function () {
      if (self.mathHasBeenAdded) {
        self.mathHasBeenAdded = false;
        resizeH5PContent();
      }
    };

    /**
     * Handle typesetting for math formula
     */
    const handleTypeSetting = function () {
      promise = promise
        .then(() => {
          // Let Mathjax know we are clearning the typeset
          self.mathjax.typesetClear();
          self.mathjax.typesetPromise().then(() => {
            callback();
          });
        })
        .catch((err) => console.log('Typeset failed: ' + err.message))
        .finally(() => {
          self.updating = false;
        })
      return promise;
    };

    if (this.observer) {
      delete self.missedUpdates;
      /*
       * For speed reasons, we only add the elements to MathJax's queue that
       * have been passed by the mutation observer instead of always parsing
       * the complete document. We could always put everything on MathJax's queue
       * and let it work doen the queue, but this can become pretty slow.
       * Instead, we use the cooldown period to ignore further elements.
       * If elements may have been missed, we once update the complete document.
       */
      if (!this.updating) {
        this.updating = setTimeout(function () {
          if (self.missedUpdates || self.missedUpdates === undefined) {
            self.missedUpdates = false;
            handleTypeSetting();
          }
        }, this.mutationCoolingPeriod);
      }
      else {
        this.missedUpdates = true;
        // TODO: Should we have kept track of the elements that was missed
        // instead of running the whole document again?
        // Alternatively, always determine the common parent? Could be relevant
        // for the foreach in the MutationObserver callback as well to reduce
        // processing time.
      }
    }
    else {
      // TODO: Determine if this is really needed or used? Most likely it has
      // not been tested in a while and has no way of actually detecting if
      // MathJax did add something and trigger a resize on the content.
      handleTypeSetting();
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
   * Help determine if the observed mutations contained any insertion of
   * MathJax formulas.
   *
   * @param {MutationRecord[]} mutations
   * @return {Boolean}
   */
  const includesMathJaxAdded = function (mutations) {
    for (let i = 0; i < mutations.length; i++) {
      for (let j = 0; j < mutations[i].addedNodes.length; j++) {
        const node = mutations[i].addedNodes[j];
        if (node instanceof HTMLElement && (node.classList.contains('MathJax') || node.classList.contains('MathJax_Display'))) {
          return true;
        }
      }
    }

    return false;
  };

  /**
   * Trigger resize of the first H5P content on the page.
   *
   * TODO: Should only resize the content that had MathJax added.
   */
  const resizeH5PContent = function () {
    try {
      H5P.instances[0].trigger('resize');
    }
    catch (e) {
      // Do nothing if it fails
    }
  };

  return MathDisplay;
})();

// Fire up the MathDisplay
new H5P.MathDisplay();
