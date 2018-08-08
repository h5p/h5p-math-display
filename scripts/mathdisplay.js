/* globals MathJax, console, H5PIntegration */

var H5P = H5P || {};

/** @namespace H5P */
H5P.MathDisplay = (function () {
  'use strict';
  /**
   * Constructor.
   */
  function MathDisplay () {
    var that = this;

    this.isReady = false;
    this.mathjax = undefined;
    this.katex = undefined;
    this.observer = undefined;
    this.updating = null;

    // Initialize event inheritance
    H5P.EventDispatcher.call(that);

    /*
     * Initialize MathDisplay if document has loaded and thus H5PIntegration is set.
     * It might be faster to start loading MathJax/the renderer earlier, but in that
     * case we need a mechanism to detect the availability of H5PIntegration for
     * getting the source.
     */
    if (document.readyState === 'complete') {
      initialize();
    }
    else {
      document.onreadystatechange = function () {
        if (document.readyState === 'complete') {
          initialize();
        }
      };
    }

    /**
     * Initialize MathDisplay with settings that host may have set in ENV
     */
    function initialize () {
      // Get settings from host
      that.settings = (H5PIntegration && H5PIntegration.mathDisplayConfig) ? H5PIntegration.mathDisplayConfig : {};

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
                tex2jax: {
                  // Important, otherwise MathJax will be rendered inside CKEditor
                  ignoreClass: "ckeditor"
                },
                messageStyle: 'none'
              }
            }
          }
        }, that.settings);
      }

      // Uncomment to test with KaTeX
      // that.settings.renderer = {
      //   katex: {
      //     src: 'https://cdn.jsdelivr.net/npm/katex@0.10.0-beta/dist/katex.min.js',
      //     integrity: 'sha384-U8Vrjwb8fuHMt6ewaCy8uqeUXv4oitYACKdB0VziCerzt011iQ/0TqlSlv8MReCm',
      //     stylesheet: {
      //       href: 'https://cdn.jsdelivr.net/npm/katex@0.10.0-beta/dist/katex.min.css',
      //       integrity: 'sha384-9tPv11A+glH/on/wEu99NVwDPwkMQESOocs/ZGXPoIiLE8MU/qkqUcZ3zzL+6DuH'
      //     },
      //     autorender: {
      //       src: 'https://cdn.jsdelivr.net/npm/katex@0.10.0-beta/dist/contrib/auto-render.min.js',
      //       integrity: 'sha384-aGfk5kvhIq5x1x5YdvCp4upKZYnA8ckafviDpmWEKp4afOZEqOli7gqSnh8I6enH'
      //     },
      //     // Common Katex options
      //     config: {
      //       // Important, otherwise KaTeX will be rendered inside CKEditor
      //       // Property ignoredClass available as of KaTeX release 0.10.0
      //       ignoredClasses: ['ckeditor']
      //     }
      //   }
      // };

      that.parent = that.settings.parent;

      // If h5p-container is not set, we're in an editor that may still be loading, hence document
      that.container = that.settings.container || document.getElementsByClassName('h5p-container')[0] || document;

      if (that.settings.renderer.mathjax) {
        // Load MathJax dynamically
        getMathJax(that.settings.renderer.mathjax, function(mathjax, error) {
          if (error) {
            console.warn(error);
            return;
          }

          that.mathjax = mathjax;
          start();
        });
      }

      if (that.settings.renderer.katex) {
        getKatex(that.settings.renderer.katex, function(results, error) {
          if (error) {
            console.warn(error);
            return;
          }

          that.katex = results.katex;

          getAutorender(that.settings.renderer.katex, function(results, error) {
            if (error) {
              console.warn(error);
              return;
            }

            that.renderMathInElement = results.renderMathInElement;

            start();
          });
        });
      }
    }

    /**
     * Start MathDisplay.
     */
    function start () {
      startObservers(that.settings.observers);

      // MathDisplay is ready
      that.isReady = true;

      // Update math content and resize
      that.update(that.container);
    }

    /**
     * Start observers.
     *
     * @param {object[]} observers - Observers to be used.
     */
    function startObservers (observers) {
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
     * Wait until MathJax has been loaded. Maximum of 5 seconds by default.
     *
     * @param {function} callback - Callback with params {object} mathjax and {string} error.
     * @param {number} [counter=50] - Maximum number of retries.
     * @param {number} [interval=100] - Wait time per poll in ms.
     */
    function waitForMathJax (callback, counter, interval) {
      counter = (typeof counter !== 'undefined') ? counter : 50;
      interval = interval || 100;

      if (typeof MathJax !== 'undefined') {
        callback(MathJax);
      }
      else if (counter > 0) {
        setTimeout(waitForMathJax, interval, callback, --counter);
      }
      else {
        callback(undefined, 'Could not load MathJax');
      }
    }

    /**
     * Wait until Katex has been loaded. Maximum of 5 seconds by default.
     *
     * @param {function} callback - Callback with params {object} katex and {string} error.
     * @param {number} [counter=50] - Maximum number of retries.
     * @param {number} [interval=100] - Wait time per poll in ms.
     */
    function waitForKatex (callback, counter, interval) {
      counter = (typeof counter !== 'undefined') ? counter : 50;
      interval = interval || 100;

      if (typeof katex !== 'undefined') {
        callback({katex:katex});
      }
      else if (counter > 0) {
        setTimeout(waitForKatex, interval, callback, --counter);
      }
      else {
        callback(undefined, 'Could not load Katex');
      }
    }

    /**
     * Wait until Autorender has been loaded. Maximum of 5 seconds by default.
     *
     * @param {function} callback - Callback with params {object} katex and {string} error.
     * @param {number} [counter=50] - Maximum number of retries.
     * @param {number} [interval=100] - Wait time per poll in ms.
     */
    function waitForAutorender (callback, counter, interval) {
      counter = (typeof counter !== 'undefined') ? counter : 50;
      interval = interval || 100;

      if (typeof renderMathInElement !== 'undefined') {
        callback({renderMathInElement: renderMathInElement});
      }
      else if (counter > 0) {
        setTimeout(waitForAutorender, interval, callback, --counter);
      }
      else {
        callback(undefined, 'Could not load Autorender');
      }
    }

    /**
     * Get MathJax if available.
     *
     * For MathJax in-line-configuration options cmp.
     * https://docs.mathjax.org/en/latest/configuration.html#using-in-line-configuration-options
     *
     * @param {object} settings - MathJax in-line configuration options.
     * @param {function} callback - Callback function.
     * @return {function} Callback with params {object} mathjax and {string} error.
     */
    function getMathJax (settings, callback) {
      // Add MathJax script to document
      var script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = settings.src;

      // Fallback for some versions of Opera.
      var config = 'MathJax.Hub.Config(' + JSON.stringify(settings.config) + ');';
      if (window.opera) {
        script.innerHTML = config;
      }
      else {
        script.text = config;
      }
      document.getElementsByTagName('head')[0].appendChild(script);

      return waitForMathJax(callback);
    }

    function getKatex (settings, callback) {
      // Add Katex script to document
      var stylesheet = document.createElement('link');
      stylesheet.type = 'text/css';
      stylesheet.rel = 'stylesheet';
      stylesheet.href = settings.stylesheet.href;
      if (settings.stylesheet.integrity) {
        stylesheet.intregrity = settings.stylesheet.integrity;
        stylesheet.crossOrigin = 'anonymous';
      }
      document.getElementsByTagName('head')[0].appendChild(stylesheet);

      var script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = settings.src;
      if (settings.integrity) {
        script.integrity = settings.integrity;
        script.crossOrigin = 'anonymous';
      }
      document.getElementsByTagName('head')[0].appendChild(script);

      return waitForKatex(callback);
    }

    function getAutorender (settings, callback) {
      // Add Autorender script to document
      var script = document.createElement('script');
      script.src = settings.autorender.src;
      if (settings.autorender.integrity) {
        script.integrity = settings.autorender.integrity;
        script.crossOrigin = 'anonymous';
      }
      document.getElementsByTagName('head')[0].appendChild(script);

      return waitForAutorender(callback);
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
  MathDisplay.prototype.startDOMChangedListener = function (params) {
    var that = this;
    H5P.externalDispatcher.on('domChanged', function (event) {
      that.update(event.data.$target[0]);
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
    function intervalUpdate (time) {
      if (that.mathjax) {
        setTimeout(function() {
          if (that.mathjax.Hub.queue.running + that.mathjax.Hub.queue.pending === 0) {
            that.update(document.body);
          }
          intervalUpdate(time);
        }, time);
      }

      if (that.katex) {
        setTimeout(function() {
          that.update(document.body);
          intervalUpdate(time);
        }, time);
      }
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
      // Filter out elements that have nothing to do with the inner HTML.
      mutations
        .filter(function (mutation) {
          return mutation.target.id.indexOf('MathJax') !== 0 &&
            (mutation.target.className.indexOf && mutation.target.className.indexOf('MathJax') !== 0) &&
            mutation.target.tagName !== 'HEAD' &&
            mutation.addedNodes.length > 0;
        })
        .forEach(function(mutation) {
          that.update(mutation.target);
        });
    });

    this.observer.observe(this.container, {childList: true, subtree: true});
    return true;
  };

  /**
   * Update the DOM by MathJax.
   *
   * @param {object[]} [elements] - DOM elements to be updated.
   * @param {object} [callback] - Callback function.
   */
  MathDisplay.prototype.update = function (elements, callback) {
    var that = this;

    if (!this.isReady) {
      return;
    }

    // Update was triggered by resize triggered by MathJax, no update needed
    if (this.mathJaxTriggeredResize === true) {
      this.mathJaxTriggeredResize = false;
      return;
    }

    // Default resize after MathJax has finished
    if (typeof callback === 'undefined' && this.mathjax) {
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
    if (typeof callback === 'undefined' && this.katex) {
      callback = function () {
        that.mathJaxTriggeredResize = true;
        if (that.parent) {
          that.parent.trigger('resize');
        }
        else {
          // Best effort to resize.
          window.parent.dispatchEvent(new Event('resize'));
        }
      };
    }

    // The callback will be forwarded to MathJax
    if (this.observer) {
      /*
       * For speed reasons, we only add the elements to MathJax's queue that
       * have been passed by the mutation observer instead of always parsing
       * the complete document. We could always put everything on MathJax's queue
       * and let it work doen the queue, but this can become pretty slow.
       * Instead, we use the cooldown period to ignore further elements.
       * If elements may have been missed, we once update the complete document.
       */
      if (!this.updating) {
        if (this.missedUpdates) {
          this.missedSingleUpdates = false;
          elements = document.body;
        }
        if (this.mathjax) {
          this.mathjax.Hub.Queue(["Typeset", this.mathjax.Hub, elements], callback);
        }
        else if (this.katex) {
          // TODO: KaTeX will render in CKEditor and can only ignore tags, not class names :-/
          this.renderMathInElement(elements, this.settings.renderer.katex.config);
          callback();
        }
        this.updating = setTimeout(function () {
          that.updating = null;
        }, this.mutationCoolingPeriod);
      }
      else {
        this.missedUpdates = true;
      }
    }
    else {
      if (this.mathjax) {
        this.mathjax.Hub.Queue(["Typeset", that.mathjax.Hub, elements], callback);
      }
      else if (this.katex) {
        // TODO: KaTeX will render in CKEditor and can only ignore tags, not class names :-/
        this.renderMathInElement(elements, this.settings.renderer.katex.config);
        callback();
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

  return MathDisplay;
}) ();

// Fire up the MathDisplay
new H5P.MathDisplay();
