import '../scripts/config.js';
import MathDisplay from '../scripts/mathdisplay.js';

// eslint-disable-next-line no-global-assign
H5P = H5P || {};
H5P.MathDisplay = MathDisplay;

// Fire up MathDisplay when the library is preloaded by H5P.
new H5P.MathDisplay();