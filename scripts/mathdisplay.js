/* globals MathJax, console */

var H5P = H5P || {};

/** @namespace H5P */
H5P.MathDisplay = (function () {
  'use strict';
  /**
   * Constructor.
   *
   * @param {object} [settings] - Optional settings (e.g. for choosing renderer).
   * @param {object} [settings.parent] - Parent.
   * @param {object} [settings.container] - DOM object to use math on.
   */
  function MathDisplay (settings) {
    console.log('MathJax started');
    const that = this;

    this.isReady = false;
    this.mathjax = undefined;
    this.observer = undefined;
    this.updating = null;

    // Initialize event inheritance
    H5P.EventDispatcher.call(that);

    document.onreadystatechange = function () {
      if ( document.readyState === 'complete' ) {
        // Get settings from host
        that.settings = (H5PIntegration && H5PIntegration.mathDisplayConfig) ? H5PIntegration.mathDisplayConfig : {};

        // Set default observers if none configured. Will need tweaking.
        if (!that.settings.observers || that.settings.observers.length === 0) {
          that.settings = that.extend({
            observers: [
              {name: 'mutationObserver', params: {cooldown: 100}},
              {name: 'domChangedListener'},
              //{name: 'interval', params: {time: 1000}},
            ]
          }, that.settings);
        }

        // Set MathJax using CDN as default if no config given.
        if (!that.settings.renderer || Object.keys(that.settings.renderer).length === 0) {
          that.settings = that.extend({
            renderer: {
              // See http://docs.mathjax.org/en/latest/options/index.html for options
              mathjax: {
                src: 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.5/MathJax.js',
                config: {
                  extensions: ['tex2jax.js'],
                  jax: ['input/TeX','output/HTML-CSS'],
                  messageStyle: 'none'
                }
              }
            }
          }, that.settings);
        }

        that.parent = that.settings.parent;
        that.container = that.settings.container || document.getElementsByClassName('h5p-container')[0];

        if (that.settings.renderer.mathjax) {
          // Load MathJax dynamically
          // It might be faster to start loading MathJax earlier, but
          // in that case we need a mechanism to detect the availability of
          // H5PIntegration for getting the source.
          // TODO: Make this ready for IE11, sigh (Promise)
          getMathJax(that.settings.renderer.mathjax)
            .then(function(result) {
              that.mathjax = result;

              startObservers();
            })
            .catch(function(error) {
              console.warn(error);
            });
        }
      }
    };

    /**
     * Start observers.
     */
    function startObservers () {
      // Start observers
      that.settings.observers.forEach(function (observer) {
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

      // MathDisplay is ready
      that.isReady = true;

      // Update math content and resize
      that.update(that.container);
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
   *
   * @param {object} params - Parameters.
   */
  MathDisplay.prototype.startDOMChangedListener = function (params) {
    const that = this;
    H5P.externalDispatcher.on('domChanged', function (event) {
      that.update(event.data.$target[0]);
    });
  };

  /**
   * Start interval updater.
   *
   * @param {object} params - Parameters.
   * @param {number} params.time - Interval time.
   */
  MathDisplay.prototype.startIntervalUpdater = function (params) {
    const that = this;

    /**
     * Update math display in regular intervals.
     *
     * @param {number} time - Interval time.
     */
    function intervalUpdate (time) {
      setTimeout(function() {
        if (that.mathjax.Hub.queue.running + that.mathjax.Hub.queue.pending === 0) {
          that.update(document);
        }
        intervalUpdate(time);
      }, time);
    }

    intervalUpdate(params.time);
  };

  /**
   * Start mutation observer.
   *
   * @param {object} params - Paremeters.
   * @param {number} params.cooldown - Cooldown period.
   */
  MathDisplay.prototype.startMutationObserver = function (params) {
    const that = this;

    if (!this.container) {
      return false;
    }

    this.mutationCoolingPeriod = params.cooldown;

    this.observer = new MutationObserver(function (mutations) {
      // Filter out elements that have nothing to do with the inner HTML.
      mutations
        .filter(function (mutation) {
          return !mutation.target.id.startsWith('MathJax') &&
            !mutation.target.className.startsWith('MathJax') &&
            mutation.addedNodes.length > 0;
        })
        .forEach(function(mutation) {
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

    // Update was triggered by resize triggered by MathJax, no update needed
    if (that.mathJaxTriggeredResize === true) {
      that.mathJaxTriggeredResize = false;
      return;
    }

    // Default resize after MathJax has finished
    if (typeof callback === 'undefined') {
      callback = function () {
        // Resize interaction after there are no more DOM changes to expect by MathJax

        /**
         * Wait until MathJax has finished rendering.
         * By default, will wait 10 seconds and check every 100ms if MathJax
         * has finished
         *
         * @param {number} [counter=100] - Maximum number of retries.
         * @param {number} [interval=100] - Wait time per poll in ms.
         */
        function waitForMathJaxDone (counter, interval) {
          counter = counter || 100;
          interval = interval || 100;

          if (that.mathjax.Hub.queue.running + that.mathjax.Hub.queue.pending === 0 || counter === 0) {
            that.mathJaxTriggeredResize = true;
            if (that.parent) {
              that.parent.trigger('resize');
            }
            else {
              // Best effort to resize.
              window.parent.dispatchEvent(new Event('resize'));
            }
          }
          else {
            counter--;
            setTimeout(waitForMathJaxDone, interval, counter);
          }
        }

        waitForMathJaxDone();
      };
    }

    // This branching isn't really necessary now, but it might become.
    // The callback will be forwarded to MathJax
    if (this.observer) {
      if (!this.updating) {
        that.mathjax.Hub.Queue(["Typeset", that.mathjax.Hub, elements], callback);
        this.updating = setTimeout(function () {
          that.updating = null;
        }, this.mutationCoolingPeriod);
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

  return MathDisplay;
}) ();

// Fire up the MathDisplay
new H5P.MathDisplay();
