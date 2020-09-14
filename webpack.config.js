
module.exports = {
    entry: './index.js',
    resolve:  {
        modules: ['./node_modules']
    },
    optimization: {
        minimize: false
    },
    output: {
        filename: 'validation-new.bundle.js',
        library: 'validation'
    },
    node: {
        tls: "empty",
        fs: "empty",
        net: "empty"
    }
};