// Test runner: hand-rolled because Apps Script has no native test framework.
// Tests register themselves via registerTest(name, fn) at top-level of each Test_*.gs file.
// runAllTests() executes them all and writes pass/fail rows to the "Test Results" tab.
// Invoke from the Apps Script editor only — there's no menu entry, by design.

var TESTS = [];

function registerTest(name, fn) {
  TESTS.push({ name: name, fn: fn });
}

function assert(cond, msg) {
  if (!cond) throw new Error('Assertion failed: ' + (msg || 'no message'));
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error('Expected ' + JSON.stringify(expected) + ' got ' + JSON.stringify(actual) + (msg ? ' — ' + msg : ''));
  }
}

function assertContains(haystack, needle, msg) {
  if (typeof haystack !== 'string' || haystack.indexOf(needle) === -1) {
    throw new Error('Expected to contain ' + JSON.stringify(needle) + ' — ' + (msg || ''));
  }
}

function assertThrows(fn, msg) {
  var threw = false;
  try { fn(); } catch (e) { threw = true; }
  if (!threw) throw new Error('Expected throw — ' + (msg || ''));
}

function runAllTests() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Test Results');
  if (!sheet) sheet = ss.insertSheet('Test Results');
  sheet.clearContents();
  sheet.appendRow(['Timestamp', 'Test', 'Status', 'Detail']);
  var pass = 0, fail = 0;
  for (var i = 0; i < TESTS.length; i++) {
    var t = TESTS[i];
    var start = new Date();
    try {
      t.fn();
      sheet.appendRow([start, t.name, 'PASS', '']);
      pass++;
    } catch (e) {
      sheet.appendRow([start, t.name, 'FAIL', String((e && e.message) || e)]);
      fail++;
    }
  }
  SpreadsheetApp.getUi().alert('Tests: ' + pass + ' passed, ' + fail + ' failed');
}
