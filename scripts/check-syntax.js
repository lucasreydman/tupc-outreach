// Syntax-check every .gs file in src/.
// Apps Script is V8 JavaScript with extra globals (SpreadsheetApp, GmailApp, ...).
// `new Function(source)` parses the source without executing it. Undefined
// identifiers like `SpreadsheetApp` are fine because parsing is symbol-blind.
//
// Usage: `node scripts/check-syntax.js [file ...]`
// With no args, checks every .gs file under src/.

const fs = require('fs');
const path = require('path');

function listGsFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.gs'))
    .map(f => path.join(dir, f));
}

const targets = process.argv.slice(2).length
  ? process.argv.slice(2)
  : listGsFiles(path.join(__dirname, '..', 'src'));

let failures = 0;
for (const file of targets) {
  const source = fs.readFileSync(file, 'utf8');
  try {
    new Function(source); // parse only
    console.log('OK  ' + file);
  } catch (e) {
    failures++;
    console.error('FAIL ' + file + ': ' + e.message);
  }
}

if (failures > 0) {
  console.error('\n' + failures + ' file(s) failed syntax check.');
  process.exit(1);
}
console.log('\nAll ' + targets.length + ' file(s) parse cleanly.');
