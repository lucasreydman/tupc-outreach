// Copies appsscript.json from repo root into src/ so `clasp push` picks it up.
// Run automatically by the `prepush` npm hook.
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'appsscript.json');
const dest = path.join(__dirname, '..', 'src', 'appsscript.json');

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(src, dest);
console.log('Synced appsscript.json -> src/appsscript.json');
