/* globals MathJax */

var H5P = H5P || {};

/** @namespace H5P */
H5P.MathDisplay = (function () {
  'use strict';

  console.log('MATHDISPLAY', document);

  let params;
  let isReady = false;
  let mathjax;
  let observer;
  let mathJaxHasRendered = false;
  //this.container = container || document.getElementsByClassName('h5p-container')[0];
  const container = document;

  // See http://docs.mathjax.org/en/latest/options/index.html for options
  let settings = {
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
  };
  let updating = null;

  if (!params || containsMath(params)) {
    // Load MathJax dynamically
    // TODO: Make this ready for IE11, sigh
    getMathJax(settings.renderers.mathjax)
      .then(function(result) {
        mathjax = result;

        // Choose wisely (or keep both?)
        if (settings.observers.indexOf('mutationObserver') !== -1) {
          startObserver();
        }
        if (settings.observers.indexOf('domChangedListener') !== -1) {
          // TODO: Deactivated for testing
          //startDOMChangedListener();
        }

        // MathDisplay is ready
        isReady = true;

        // Update math content and resize
        update(container);
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

  /**
   * Start domChangedListener.
   */
  function startDOMChangedListener () {
    H5P.externalDispatcher.on('domChanged', function (event) {
      update(event.data.$target[0]);
    });
  }

  /**
   * Start mutation observer.
   */
  function startObserver () {
    if (!container) {
      return false;
    }

    observer = new MutationObserver(function (mutations) {
      // Filter out elements that have nothing to do with the inner HTML.
      mutations = mutations.filter(function (mutation) {
        return !mutation.target.id.startsWith('MathJax') &&
          !mutation.target.className.startsWith('MathJax') &&
          mutation.addedNodes.length > 0;
      });
      mutations.forEach(function(mutation) {
        update(mutation.target);
      });
    });

    observer.observe(container, {childList: true, subtree: true});
    return true;
  }

  /**
   * Update the DOM by MathJax.
   *
   * @param {object[]} [elements] - DOM elements to be updated.
   * @param {object} [callback] - Callback function.
   */
  function update (elements, callback) {
    if (!isReady) {
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
            that.parent.trigger('resize');
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
        }, MATHDISPLAY_COOLING_PERIOD);
      }
    }
    else {
      mathjax.Hub.Queue(["Typeset", mathjax.Hub, elements], callback);
    }
  }

  // Will reduce polling of the MutationObserver
  const MATHDISPLAY_COOLING_PERIOD = 100;

  //return MathDisplay;
}) ();
