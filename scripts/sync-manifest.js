// Pre-push housekeeping:
//   1. Copies appsscript.json from repo root into src/ so `clasp push` picks it up.
//   2. Moves .clasp.json out of src/ if clasp put it there. Newer clasp versions
//      (>= 3.x) write .clasp.json into rootDir when `--rootDir ./src` is set, but
//      `clasp push` still looks for it at the project root. This auto-corrects it.
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const src = path.join(rootDir, 'appsscript.json');
const dest = path.join(rootDir, 'src', 'appsscript.json');

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(src, dest);
console.log('Synced appsscript.json -> src/appsscript.json');

const claspInSrc = path.join(rootDir, 'src', '.clasp.json');
const claspAtRoot = path.join(rootDir, '.clasp.json');
if (fs.existsSync(claspInSrc) && !fs.existsSync(claspAtRoot)) {
  fs.renameSync(claspInSrc, claspAtRoot);
  console.log('Moved .clasp.json from src/ to project root');
}
