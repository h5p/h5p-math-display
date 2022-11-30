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
          path.resolve(__dirname, "scripts"),
          path.resolve(__dirname, "entries")
        ],
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
        { from: "../node_modules/mathjax-full/es5/output/chtml/fonts/woff-v2", to: "fonts" }
      ],
    }),
  ]
};
