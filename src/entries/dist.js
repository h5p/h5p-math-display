import MathDisplay from '../scripts/mathdisplay.js';

// eslint-disable-next-line no-global-assign
H5P = H5P || {};
H5P.MathDisplay = MathDisplay;

// Fire up MathDisplay when the library is preloaded by H5P.
// Only create a single instance; the bundle may load more than once per page.
if (!window.H5PMathDisplayInstance) {
  window.H5PMathDisplayInstance = new H5P.MathDisplay();
}
