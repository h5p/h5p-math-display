/* globals MathJax, console */

var H5P = H5P || {};

/** @namespace H5P */
H5P.MathDisplay = (function () {
  'use strict';
  /**
   * Constructor.
   * adding the MathDisplay library and "new H5P.MathDisplay(this)" to a content type should be enough to make it work
   *
   * @param {object} parent - Parent.
   * @param {object} [params] - Params of library.
   * @param {object} [container] - DOM object to use math on.
   * @param {object} [settings] - Optional settings (e.g. for choosing renderer).
   */
  function MathDisplay (parent, params, container, settings) {
    const that = this;

    this.isReady = false;
    this.mathjax = undefined;
    this.observer = undefined;
    this.parent = parent;
    this.container = container || document.getElementsByClassName('h5p-container')[0];

    // See http://docs.mathjax.org/en/latest/options/index.html for options
    this.settings = this.extend(
      {
        observers: ['mutationObserver', 'domChangedListener'],
        renderers: {
          mathjax: {
            src: 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.4/MathJax.js',
            config: {
              extensions: ['tex2jax.js'],
              jax: ['input/TeX','output/HTML-CSS'],
              messageStyle: 'none'
            }
          }
        }
      },
      settings || {}
    );
    this.updating = null;

    // Initialize event inheritance
    H5P.EventDispatcher.call(that);

    if (!params || containsMath(params)) {
      // Load MathJax dynamically
      // TODO: Make this ready for IE11, sigh
      getMathJax(that.settings.renderers.mathjax)
        .then(function(result) {
          that.mathjax = result;

          // Choose wisely (or keep both?)
          if (that.settings.observers.indexOf('mutationObserver') !== -1) {
            that.startObserver();
          }
          if (that.settings.observers.indexOf('domChangedListener') !== -1) {
            that.startDOMChangedListener();
          }

          // MathDisplay is ready
          that.isReady = true;

          // Update math content and resize
          that.update(that.container);
        })
        .catch(function(error) {
          console.warn(error);
        });
    }

    /**
     * Determine if params contain math.
     *
     * @param {object} params - Parameters.
     * @param {boolean} [found] - used for recursion.
     * @return {boolean} True, if params contain math.
     */
    function containsMath (params, found) {
      found = found || false;

      for (let param in params) {
        if (typeof params[param] === 'string') {
          /*
           * $$ ... $$ LaTeX block
           * \[ ... \] LaTeX block
           * \( ... \) LaTeX inline
           */
          const mathPattern = /\$\$.+\$\$|\\\[.+\\\]|\\\(.+\\\)/g;
          if (mathPattern.test(params[param])) {
            found = true;
            break;
          }
        }
        if (!found) {
          if (Array.isArray(params[param])) {
            for (var i = 0; i < params[param].length; i++) {
              found = containsMath(params[param][i], found);
              if (found) {
                break;
              }
            }
          }
          if (typeof params[param] === 'object') {
            found = containsMath(params[param], found);
          }
        }
      }
      return found;
    }

    /**
     * Wait until MathJax has been loaded.
     *
     * @param {function} resolve - Function on success.
     * @param {function} reject - Function on failure.
     * @param {number} [counter=10] - Maximum number of retries.
     * @param {number} [interval=100] - Wait time per poll in ms.
     */
    function waitForMathJax (resolve, reject, counter, interval) {
      counter = counter || 10;
      interval = interval || 100;

      if (typeof MathJax !== 'undefined') {
        return(resolve(MathJax));
      }
      else if (counter > 0) {
        setTimeout(waitForMathJax, interval, resolve, reject, --counter);
      }
      else {
        return(reject('Could not start MathJax'));
      }
    }

    /**
     * Get promise for MathJax availability.
     *
     * @param {object} settings - Settings.
     * @param {string} settings.src - Source, e.g. CDN.
     * @return {Promise} Promise for MathJax availability.
     */
    function getMathJax (settings) {
      // Add MathJax script to document
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = settings.src;

      // Fallback for some versions of Opera.
      const config = 'MathJax.Hub.Config(' + JSON.stringify(settings.config) + ');';
      if (window.opera) {
        script.innerHTML = config;
      }
      else {
        script.text = config;
      }
      document.getElementsByTagName('head')[0].appendChild(script);

      return new Promise(waitForMathJax);
    }
  }

  // Extends the event dispatcher
  MathDisplay.prototype = Object.create(H5P.EventDispatcher.prototype);
  MathDisplay.prototype.constructor = MathDisplay;

  /**
   * Start domChangedListener.
   */
  MathDisplay.prototype.startDOMChangedListener = function () {
    const that = this;
    H5P.externalDispatcher.on('domChanged', function (event) {
      that.update(event.data.$target[0]);
    });
  };

  /**
   * Start mutation observer.
   */
  MathDisplay.prototype.startObserver = function () {
    const that = this;

    if (!this.container) {
      return false;
    }

    this.observer = new MutationObserver(function (mutations) {
      // Filter out elements that have nothing to do with the inner HTML.
      mutations = mutations.filter(function (mutation) {
        return !mutation.target.id.startsWith('MathJax') &&
          !mutation.target.className.startsWith('MathJax') &&
          mutation.addedNodes.length > 0;
      });
      mutations.forEach(function(mutation) {
        that.update(mutation.target);
      });
    });

    this.observer.observe(this.container, {childList: true});
    return true;
  };

  /**
   * Update the DOM by MathJax.
   *
   * @param {object[]} [elements] - DOM elements to be updated.
   * @param {object} [callback] - Callback function.
   */
  MathDisplay.prototype.update = function (elements, callback) {
    const that = this;

    if (!this.isReady) {
      return;
    }

    // Update was triggered after MathJax rendering, no further update needed
    if (that.mathJaxHasRendered === true) {
      that.mathJaxHasRendered = false;
      return;
    }

    // Default resize after MathJax has finished
    if (typeof callback === 'undefined') {
      callback = function () {
        // Resize interaction after there are no more DOM changes to expect by MathJax

        /**
         * Wait until MathJax has finished rendering.
         *
         * @param {number} [counter=10] - Maximum number of retries.
         * @param {number} [interval=50] - Wait time per poll in ms.
         */
        function waitForMathJaxDone (counter, interval) {
          counter = counter || 10;
          interval = interval || 50;

          if (that.mathjax.Hub.queue.running + that.mathjax.Hub.queue.pending === 0) {
            that.mathJaxHasRendered = true;
            that.parent.trigger('resize');
          }
          else if (counter > 0) {
            setTimeout(waitForMathJaxDone, interval, --counter);
          }
          else {
            // Will not wait any longer
          }
        }

        waitForMathJaxDone();
      };
    }

    // This branching isn't really necessary now, but it might become.
    if (this.observer) {
      if (!this.updating) {
        this.updating = setTimeout(function () {
          that.mathjax.Hub.Queue(["Typeset", that.mathjax.Hub, elements], callback);
          that.updating = null;
        }, MATHDISPLAY_COOLING_PERIOD);
      }
    }
    else {
      that.mathjax.Hub.Queue(["Typeset", that.mathjax.Hub, elements], callback);
    }
  };

  /**
   * Extend an array just like JQuery's extend.
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

  // Will reduce polling of the MutationObserver
  const MATHDISPLAY_COOLING_PERIOD = 50;

  return MathDisplay;
}) ();
