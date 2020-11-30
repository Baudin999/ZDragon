import svelte from "rollup-plugin-svelte";
import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import { terser } from "rollup-plugin-terser";
import css from "rollup-plugin-css-only";
import autoPreprocess from "svelte-preprocess";

const production = !process.env.ROLLUP_WATCH;

export default {
  input: "src/main.js",
  output: {
    sourcemap: true,
    format: "iife",
    name: "woezel",
    file: "./public/bundle.js"
  },
  plugins: [
    svelte({
      // enable run-time checks when not in production
      dev: !production,

      // preprocess
      preprocess: autoPreprocess({
        /* options */
      }),

      // we'll extract any component CSS out into
      // a separate file — better for performance
      css: css => {
        css.write("./public/bundle.css");
      }
    }),
    css({
      output: "./public/styles.css"
    }),


    // If you have external dependencies installed from
    // npm, you'll most likely need these plugins. In
    // some cases you'll need additional configuration —
    // consult the documentation for details:
    // https://github.com/rollup/rollup-plugin-commonjs
    resolve({
      browser: true,
      dedupe: importee =>
        importee === "svelte" || importee.startsWith("svelte/")
    }),
    commonjs(),
    // !production && serve(),
    //!production && livereload("./../wwwroot/build"),
    production && terser()
  ],
  watch: {
    clearScreen: false
  }
};

function serve() {
  let started = false;

  return {
    writeBundle() {
      if (!started) {
        started = true;

        require("child_process").spawn("npm", ["run", "start", "--", "--dev"], {
          stdio: ["ignore", "inherit", "inherit"],
          shell: true
        });
      }
    }
  };
}
