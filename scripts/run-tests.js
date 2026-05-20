// Local test runner for Apps Script .gs files.
//
// Concatenates every .gs file in src/ into a single sandbox, shims the
// Google Apps Script globals that production code references behind type
// guards, and invokes registerTest-collected tests directly.
//
// This won't catch bugs in code paths that touch SpreadsheetApp / GmailApp /
// etc. directly — but our production code accepts those as parameters and
// our tests pass fakes, so the hot paths are exercised. The shims exist only
// to satisfy `applyValidations` and the implicit `ss = ss || SpreadsheetApp...`
// default arg patterns.
//
// Usage: `node scripts/run-tests.js`

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const srcDir = path.join(__dirname, '..', 'src');
const files = fs.readdirSync(srcDir)
  .filter(f => f.endsWith('.gs'))
  .sort((a, b) => {
    // Load fakes and runner first so Test_*.gs files can call registerTest.
    // Load production modules before Test_* tests that register against them.
    const order = (n) => {
      if (n === 'Test_fakes.gs') return 0;
      if (n === 'Test_runner.gs') return 1;
      if (n.startsWith('Test_')) return 3;
      return 2;
    };
    return order(a) - order(b) || a.localeCompare(b);
  });

const sources = files.map(f => ({
  name: f,
  source: fs.readFileSync(path.join(srcDir, f), 'utf8')
}));

// Minimal globals. Anything our production code touches behind a `typeof X === 'undefined'`
// guard can stay undefined; anything it touches unconditionally must be shimmed here.
const context = {
  console,
  Date,
  JSON,
  Math,
  Object,
  Array,
  String,
  Number,
  Boolean,
  Error,
  TypeError,
  RangeError,
  parseInt,
  parseFloat,
  isNaN,
  isFinite,
  setTimeout,
  clearTimeout,
  Utilities: {
    sleep: () => {} // no-op in tests
  },
  // SpreadsheetApp, GmailApp, DriveApp, ScriptApp, Session, UrlFetchApp,
  // HtmlService — left undefined. Production code that references them
  // either guards with `typeof X === 'undefined'` or is passed a fake.
  __testResults: { pass: 0, fail: 0, failures: [] }
};

vm.createContext(context);

for (const { name, source } of sources) {
  try {
    vm.runInContext(source, context, { filename: name });
  } catch (e) {
    console.error('Failed to load ' + name + ': ' + e.message);
    process.exit(1);
  }
}

// Drive the test runner manually (registerTest pushed everything into context.TESTS).
const tests = context.TESTS || [];
let pass = 0, fail = 0;
const failures = [];
for (const t of tests) {
  try {
    t.fn();
    process.stdout.write('  ✓ ' + t.name + '\n');
    pass++;
  } catch (e) {
    process.stdout.write('  ✗ ' + t.name + '\n      ' + ((e && e.message) || e) + '\n');
    failures.push({ name: t.name, error: (e && e.message) || String(e) });
    fail++;
  }
}

console.log('\n' + pass + ' passed, ' + fail + ' failed (' + tests.length + ' total)');
if (fail > 0) process.exit(1);
