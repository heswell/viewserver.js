import babel from 'rollup-plugin-babel'
import postcss from 'rollup-plugin-postcss'
import sizes from 'rollup-plugin-sizes';

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
          }),
          sizes()
    ]
};
