var IgnorePlugin = require('webpack/lib/IgnorePlugin')
var autoprefixer = require('autoprefixer')
var path = require('path')
var postcssCssnext = require('postcss-cssnext')
var postcssImport = require('postcss-import')

module.exports = {
    entry: {
        'app': './src/js/app.js',
        'background': './src/js/background.js'
    },
    output: {
        path: './app/chrome/js',
        filename: '[name].js'
    },
    resolve: {
        extensions: ['', '.ts', '.js']
    },
    module: {
        loaders: [
            {
                test: /\.css/,
                loaders: ['css-loader', 'postcss-loader']
            },
            {
                test: /\.ts$/,
                loaders: ['babel-loader', 'ts-loader']
            },
            {
                test: /\.js$/,
                exclude: path.resolve(__dirname, 'node_modules'),
                loader: 'babel-loader'
            }
        ]
    },
    plugins: [
        new IgnorePlugin(/^crypto$/)
    ],
    postcss: function() {
        return [autoprefixer, postcssImport, postcssCssnext]
    }
}
