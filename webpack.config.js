const path = require('path');

module.exports = {
  entry: {
    background: './background.js',
    popup: './popup.js'
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, '.'),
  },
  mode: 'production',
  resolve: {
    extensions: ['.js'],
    fallback: {
      "fs": false,
      "path": false,
      "crypto": false,
      "stream": false
    }
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  }
};