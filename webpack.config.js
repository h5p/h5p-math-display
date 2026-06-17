const path = require('path');
const nodeEnv = process.env.NODE_ENV || 'development';
const CopyPlugin = require("copy-webpack-plugin");
const libraryName = process.env.npm_package_name;

module.exports = {
  mode: nodeEnv,
  context: path.resolve(__dirname, 'src'),
  entry: "./entries/dist.js",
  devtool: (nodeEnv === 'production') ? undefined : 'inline-source-map',
  output: {
    path: path.join(__dirname, 'dist'),
    filename: `${libraryName}.js`
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        include: [
          path.resolve(__dirname, "src/scripts"),
          path.resolve(__dirname, "src/entries")
        ],
        exclude: /node_modules/,
        loader: 'babel-loader'
      }
    ]
  },
  performance: {
    hints: false,
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "../node_modules/mathjax/tex-chtml.js", to: "mathjax.js" },
        { from: "../node_modules/mathjax/sre/", to: "sre" },
        { from: "../node_modules/@mathjax/mathjax-newcm-font/chtml/woff2/mjx-ncm-zero.woff2", to: "mathjax-newcm-font/chtml/woff2/" },
        { from: "../node_modules/@mathjax/mathjax-newcm-font/chtml/woff2/mjx-ncm-brk.woff2", to: "mathjax-newcm-font/chtml/woff2/" },
        { from: "../node_modules/@mathjax/mathjax-newcm-font/chtml/woff2/mjx-ncm-n.woff2", to: "mathjax-newcm-font/chtml/woff2/" },
        { from: "../node_modules/@mathjax/mathjax-newcm-font/chtml/woff2/mjx-ncm-lo.woff2", to: "mathjax-newcm-font/chtml/woff2/" }
      ],
    }),
  ]
};
