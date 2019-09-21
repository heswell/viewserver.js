import babel from 'rollup-plugin-babel'
import postcss from 'rollup-plugin-postcss'

export default {
    input: 'index.js',
    output: {
        file: 'dist/index.js',
        format: 'es',
        sourcemap: true
    },
    plugins: [
        babel({
            exclude: 'node_modules/**'
        }),
        postcss({
            plugins: [],
            minimize: false,
            extract: true,
            sourceMap: true
          })
    ]
};