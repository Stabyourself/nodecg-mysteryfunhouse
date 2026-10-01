// Builds everything in dist/js and dist/css. `node build.mjs` for a production build,
// `node build.mjs --watch` to rebuild on changes (see the scripts in package.json).
import fs from 'node:fs';
import { build } from 'vite';
import * as sass from 'sass';

const watch = process.argv.includes('--watch');

// The global stylesheets the pages link directly. Compiled straight with sass so the
// url()s in them stay exactly as written (they point at dist/font and dist/img).
const GLOBAL_STYLES = ['style', 'mt20'];

function buildGlobalStyles() {
  fs.mkdirSync('dist/css', { recursive: true });

  for (const name of GLOBAL_STYLES) {
    try {
      const { css } = sass.compile(`src/scss/${name}.scss`, { style: 'compressed' });
      fs.writeFileSync(`dist/css/${name}.css`, css + '\n');
      console.log(`dist/css/${name}.css`);
    } catch (e) {
      console.error(`src/scss/${name}.scss: ${e.message}`);
      if (!watch) process.exitCode = 1;
    }
  }
}

buildGlobalStyles();

// see vite.config.mjs for what each mode builds
for (const mode of ['graphics', 'dashboard']) {
  await build({ mode, build: watch ? { watch: {} } : {} });
}

if (watch) {
  let timer;
  fs.watch('src/scss', (event, filename) => {
    if (!filename || !GLOBAL_STYLES.some((name) => filename === `${name}.scss`)) return;
    clearTimeout(timer);
    timer = setTimeout(buildGlobalStyles, 100);
  });
}
