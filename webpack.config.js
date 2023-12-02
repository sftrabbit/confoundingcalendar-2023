const path = require('path')

module.exports = {
  entry: './src/index.js',
  mode: 'production',
  output: {
    filename: 'game.js',
    path: path.resolve(__dirname, 'dist'),
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist')
    },
    compress: true,
    port: 8000
  }
}