# TUPC Cold Outreach Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a Google Sheet + Apps Script + Anthropic Claude cold-outreach tool that Lucas can hand off to Zach (TUPC marketing intern) in under five minutes of setup.

**Architecture:** A single Google Apps Script project bound to a Google Sheet. Apps Script provides Gmail/Drive/Sheet access natively and calls the Anthropic Messages API via `UrlFetchApp`. All state — brands, templates, config, dashboard — lives in the Sheet itself. The repo mirrors the Apps Script source via `@google/clasp` so the same source can be pushed to any new Sheet-bound script project.

**Tech Stack:** Google Apps Script (V8 runtime), Google Sheets, Gmail API (via `GmailApp`), Drive API (via `DriveApp`), Anthropic Messages API (`claude-sonnet-4-6`), `@google/clasp` for source-mirroring.

**Design spec:** [`docs/superpowers/specs/2026-05-20-tupc-outreach-design.md`](../specs/2026-05-20-tupc-outreach-design.md)

---

## Testing approach (read this before starting)

Apps Script does not run outside of Google's runtime. We can't do a tight local red-green-refactor loop. Instead:

1. **Tests are written first** (TDD red) as `Test_*.gs` files alongside implementation. They define the behavior the implementation must satisfy.
2. **Tests use fakes** (`FakeClaude`, `FakeGmail`, `FakeSpreadsheet`) defined in `src/Test_fakes.gs`. Production code must accept these via dependency injection — no `SpreadsheetApp.getActive()` calls inside business logic; always pass the sheet/Gmail/Claude objects in as parameters.
3. **Syntax is checked locally** with `node --check` on each `.gs` file (Apps Script is V8 JavaScript with extra globals; `--check` is syntax-only and ignores undefined identifiers).
4. **Tests execute** once the user runs `clasp push` and invokes `runAllTests()` from the Apps Script editor. Results land in a `Test Results` tab in the Sheet. The plan does NOT include "run tests and see green" steps because that requires a Google account the implementer doesn't have. Instead, each task ends with a syntax check + code-review-style verification.

This is a pragmatic compromise. Strict TDD ritual would require local infrastructure (esbuild + vitest + GAS shim) that costs more than it saves for a 7-file hand-off tool.

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/Main.gs` | `onOpen()` menu, sidebar entry, config-state checks |
| `src/SetupWizard.gs` | First-run config flow (HTML sidebar handlers) |
| `src/Outreach.gs` | `generateDraft`, `sendDraft`, `processFollowUps` |
| `src/ClaudeClient.gs` | `callClaude` with retry + structured errors |
| `src/GmailScanner.gs` | `scanForReplies` |
| `src/SheetSetup.gs` | `installSheetStructure` (idempotent) |
| `src/Triggers.gs` | `installTimeTriggers`, `uninstallTimeTriggers` |
| `src/Sidebar.html` | Draft review UI |
| `src/SetupSidebar.html` | First-run wizard UI |
| `src/Test_fakes.gs` | `FakeClaude`, `FakeGmail`, `FakeSheet` |
| `src/Test_runner.gs` | `runAllTests()`, assertion helpers, results writer |
| `src/Test_sheet_setup.gs` | Tests for `SheetSetup.gs` |
| `src/Test_claude_client.gs` | Tests for `ClaudeClient.gs` |
| `src/Test_outreach.gs` | Tests for `Outreach.gs` |
| `src/Test_gmail_scanner.gs` | Tests for `GmailScanner.gs` |
| `templates/tupc-brand-context.md` | Claude system prompt source (copy-baked into a `.gs` constant) |
| `templates/sheet-schema.json` | Column defs, dropdowns, defaults |
| `appsscript.json` | Manifest with Gmail/Drive/UrlFetch scopes |
| `.clasp.json.template` | Clasp config template (no script ID) |
| `package.json` | `@google/clasp` dev dep |
| `README.md` | Project overview + links |
| `docs/HANDOFF.md` | Lucas's 5-step setup |
| `docs/ZACH_QUICKSTART.md` | Zach's day-1 guide |

---

## Task 1: Project scaffolding

**Files:**
- Create: `package.json`, `appsscript.json`, `.clasp.json.template`
- Modify: `.gitignore` (already exists from spec commit)

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "tupc-outreach",
  "version": "0.1.0",
  "private": true,
  "description": "Cold sponsorship outreach tool for Toronto United Pickleball Club",
  "scripts": {
    "prepush": "node scripts/sync-manifest.js",
    "push": "clasp push -f",
    "pull": "clasp pull",
    "open": "clasp open",
    "logs": "clasp logs"
  },
  "devDependencies": {
    "@google/clasp": "^2.4.2"
  }
}
```

- [ ] **Step 2: Create `appsscript.json`** at repo root

```json
{
  "timeZone": "America/Toronto",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets.currentonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/script.scriptapp",
    "https://www.googleapis.com/auth/script.container.ui"
  ]
}
```

- [ ] **Step 3: Create `.clasp.json.template`**

```json
{
  "scriptId": "PASTE_YOUR_SCRIPT_ID_HERE",
  "rootDir": "./src",
  "filePushOrder": []
}
```

- [ ] **Step 4: Create `scripts/sync-manifest.js`** — cross-platform manifest copy invoked as a `prepush` npm hook:

```javascript
// scripts/sync-manifest.js
const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, '..', 'appsscript.json');
const dest = path.join(__dirname, '..', 'src', 'appsscript.json');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(src, dest);
console.log('Synced appsscript.json → src/appsscript.json');
```

Also add `src/appsscript.json` to `.gitignore` (it's a build artifact; the source-of-truth lives at the repo root).

- [ ] **Step 5: Commit**

```bash
git add package.json appsscript.json .clasp.json.template
git commit -m "Scaffold Apps Script project with clasp + OAuth scopes"
```

---

## Task 2: Brand context (Claude system prompt)

**Files:**
- Create: `templates/tupc-brand-context.md`

- [ ] **Step 1: Write `templates/tupc-brand-context.md`**

The full system prompt Claude will use for every email. Pulls verbatim from the TUPC 2026 Deck. Content sections: positioning paragraph, by-the-numbers, case studies (Club Med / Cadillac Fairview / Roots / TSS), pickleball growth stats, audience demographics, partnership tiers, writing rules (≤120 words, brand-specific opener, one tailored activation idea, soft 15-min CTA, no fluff, must include sender_name).

This file is the source of truth; a build step will inline it into `src/Outreach.gs` as a constant string. For simplicity, copy-paste it into a `BRAND_CONTEXT` constant directly inside `src/Outreach.gs` in Task 5. This template file remains as the canonical version humans edit.

- [ ] **Step 2: Commit**

```bash
git add templates/tupc-brand-context.md
git commit -m "Add TUPC brand context for Claude system prompt"
```

---

## Task 3: Sheet schema definition

**Files:**
- Create: `templates/sheet-schema.json`

- [ ] **Step 1: Write `templates/sheet-schema.json`**

JSON describing every tab, column, type, dropdown values, header style, frozen rows, and the default rows for `Templates` and `Config`. Schema:

```json
{
  "tabs": {
    "Brands": {
      "frozen_rows": 1,
      "columns": [
        {"key": "company", "header": "Company", "type": "text", "width": 160},
        {"key": "website", "header": "Website", "type": "text", "width": 180},
        {"key": "category", "header": "Category", "type": "dropdown", "values": ["Automotive","Retail","Health & Wellness","Apparel","Travel","Financial Services","Beverage","Tech","Fitness Equipment","CPG","Real Estate","Other"], "width": 140},
        {"key": "contact_name", "header": "Contact Name", "type": "text", "width": 160},
        {"key": "contact_email", "header": "Contact Email", "type": "email", "width": 220},
        {"key": "contact_role", "header": "Contact Role", "type": "text", "width": 160},
        {"key": "pitch_angle", "header": "Pitch Angle (optional)", "type": "text", "width": 240},
        {"key": "status", "header": "Status", "type": "dropdown", "values": ["queued","drafted","sent","follow_up_1","follow_up_2","replied","meeting_booked","won","dead","draft_failed","send_failed","invalid_email"], "width": 130},
        {"key": "draft_subject", "header": "Draft Subject", "type": "text", "width": 240},
        {"key": "draft_body", "header": "Draft Body", "type": "text", "width": 400},
        {"key": "last_action_date", "header": "Last Action", "type": "date", "width": 100},
        {"key": "next_action_date", "header": "Next Action", "type": "date", "width": 100},
        {"key": "reply_at", "header": "Reply At", "type": "datetime", "width": 140},
        {"key": "thread_id", "header": "Thread ID", "type": "text", "width": 200},
        {"key": "sent_count", "header": "Sent Count", "type": "number", "width": 90},
        {"key": "notes", "header": "Notes", "type": "text", "width": 300}
      ]
    },
    "Templates": {
      "frozen_rows": 1,
      "columns": [
        {"key": "stage", "header": "Stage", "type": "text"},
        {"key": "day_offset", "header": "Day Offset", "type": "number"},
        {"key": "user_prompt", "header": "User Prompt Template", "type": "text"}
      ],
      "default_rows": [
        ["initial", 0, "Write the FIRST cold-outreach email to {contact_name} ({contact_role}) at {company} ({category}). {pitch_hint}"],
        ["follow_up_1", 4, "Write a SHORT follow-up to {contact_name} at {company}. Acknowledge no reply, add one new piece of value tied to their {category} category, keep momentum, soft re-CTA. Reply on existing thread — do not reintroduce yourself."],
        ["follow_up_2", 10, "Write a VALUE-FIRST follow-up to {contact_name} at {company}. Lead with one concrete activation idea specific to {category}. Single-question CTA. Reply on existing thread."],
        ["breakup", 20, "Write a polite BREAKUP email to {contact_name} at {company}. Acknowledge the gap, leave the door open, one-line ask. No pressure."]
      ]
    },
    "Config": {
      "frozen_rows": 1,
      "columns": [
        {"key": "key", "header": "Key", "type": "text", "width": 200},
        {"key": "value", "header": "Value", "type": "text", "width": 500},
        {"key": "description", "header": "Description", "type": "text", "width": 400}
      ],
      "default_rows": [
        ["sender_name", "", "Your full name (used in signature and Claude prompt)"],
        ["sender_title", "Outreach, Toronto United Pickleball Club", "Your title for the signature"],
        ["sender_signature", "", "Multi-line signature (appended after each email body)"],
        ["cc_emails", "rliorti@gmail.com", "Comma-separated CC list (optional, leave blank for none)"],
        ["deck_drive_file_id", "", "Drive file ID of the TUPC sponsorship deck PDF"],
        ["anthropic_api_key", "", "Your Anthropic API key (sk-ant-...)"],
        ["anthropic_model", "claude-sonnet-4-6", "Claude model to use"],
        ["daily_send_cap", "30", "Max total sends per 24h window"],
        ["unsubscribe_mailto", "mailto:rliorti@gmail.com?subject=Unsubscribe", "CASL unsubscribe link (required)"],
        ["business_address", "Toronto, ON, Canada", "CASL business address (required)"]
      ]
    },
    "Dashboard": {
      "frozen_rows": 1,
      "columns": [
        {"key": "metric", "header": "Metric", "type": "text", "width": 240},
        {"key": "value", "header": "Value", "type": "text", "width": 120}
      ],
      "default_rows": [
        ["Sent this week", "=COUNTIFS(Brands!K:K, \">=\"&(TODAY()-7), Brands!H:H, \"sent\")+COUNTIFS(Brands!K:K, \">=\"&(TODAY()-7), Brands!H:H, \"follow_up_1\")+COUNTIFS(Brands!K:K, \">=\"&(TODAY()-7), Brands!H:H, \"follow_up_2\")"],
        ["Total sent (all time)", "=COUNTIFS(Brands!O:O, \">=1\")"],
        ["Open conversations", "=COUNTIF(Brands!H:H, \"sent\")+COUNTIF(Brands!H:H, \"follow_up_1\")+COUNTIF(Brands!H:H, \"follow_up_2\")"],
        ["Replied", "=COUNTIF(Brands!H:H, \"replied\")+COUNTIF(Brands!H:H, \"meeting_booked\")+COUNTIF(Brands!H:H, \"won\")"],
        ["Meetings booked", "=COUNTIF(Brands!H:H, \"meeting_booked\")+COUNTIF(Brands!H:H, \"won\")"],
        ["Won", "=COUNTIF(Brands!H:H, \"won\")"],
        ["Reply rate", "=IFERROR(B5/B2, 0)"],
        ["Meeting rate", "=IFERROR(B6/B2, 0)"]
      ]
    },
    "Test Results": {
      "frozen_rows": 1,
      "columns": [
        {"key": "timestamp", "header": "Timestamp", "type": "datetime", "width": 160},
        {"key": "test_name", "header": "Test", "type": "text", "width": 320},
        {"key": "status", "header": "Status", "type": "text", "width": 80},
        {"key": "detail", "header": "Detail", "type": "text", "width": 500}
      ]
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add templates/sheet-schema.json
git commit -m "Define Sheet schema for Brands/Templates/Config/Dashboard/Test Results tabs"
```

---

## Task 4: Test runner + fakes

**Files:**
- Create: `src/Test_runner.gs`, `src/Test_fakes.gs`

- [ ] **Step 1: Write `src/Test_runner.gs`**

Exports `runAllTests()`, `assert(cond, msg)`, `assertEqual(a, b, msg)`, `assertContains(haystack, needle, msg)`, `assertThrows(fn, msg)`. The runner discovers test functions via a registered array `TESTS` (each test module appends to it at top-level). On execution: clears `Test Results` tab, runs each test in try/catch, writes a row per test. At the end, logs summary toast.

```javascript
// src/Test_runner.gs
const TESTS = [];

function registerTest(name, fn) {
  TESTS.push({ name, fn });
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
  let threw = false;
  try { fn(); } catch (e) { threw = true; }
  if (!threw) throw new Error('Expected throw — ' + (msg || ''));
}

function runAllTests() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Test Results');
  if (!sheet) sheet = ss.insertSheet('Test Results');
  sheet.clearContents();
  sheet.appendRow(['Timestamp', 'Test', 'Status', 'Detail']);
  let pass = 0, fail = 0;
  TESTS.forEach(t => {
    const start = new Date();
    try {
      t.fn();
      sheet.appendRow([start, t.name, 'PASS', '']);
      pass++;
    } catch (e) {
      sheet.appendRow([start, t.name, 'FAIL', String(e && e.message || e)]);
      fail++;
    }
  });
  SpreadsheetApp.getUi().alert('Tests: ' + pass + ' passed, ' + fail + ' failed');
}
```

- [ ] **Step 2: Write `src/Test_fakes.gs`** with `FakeClaude`, `FakeGmail`, `FakeSheet` classes

`FakeClaude` returns canned `{subject, body}` JSON.
`FakeGmail` records calls to `.sendEmail()` and `.reply()` and `.getThreadById()`. Exposes a fake thread structure.
`FakeSheet` wraps an in-memory 2D array with `.getRange`, `.appendRow`, `.getDataRange`, etc. — only the surface the code actually uses.

```javascript
// src/Test_fakes.gs
function FakeClaude(opts) {
  const self = {};
  self.calls = [];
  self.nextResponse = opts && opts.nextResponse || { subject: 'Test subject', body: 'Test body — signed by Test Sender' };
  self.shouldThrow = opts && opts.shouldThrow || false;
  self.call = function (systemPrompt, userMessage, model, apiKey) {
    self.calls.push({ systemPrompt, userMessage, model, apiKey });
    if (self.shouldThrow) throw new Error('FakeClaude error');
    return self.nextResponse;
  };
  return self;
}

function FakeGmail() {
  const self = {};
  self.sent = [];
  self.threads = {};  // id -> { messages: [{ from, to, date, body }] }
  self.sendEmail = function (to, subject, plainBody, opts) {
    const threadId = 't_' + (self.sent.length + 1);
    const date = new Date();
    self.sent.push({ to, subject, plainBody, opts, threadId, date });
    self.threads[threadId] = { messages: [{ from: 'sender@example.com', to, date, body: plainBody }] };
    return { threadId };
  };
  self.getThreadById = function (id) {
    const t = self.threads[id];
    if (!t) return null;
    return {
      getMessages: function () {
        return t.messages.map(m => ({
          getFrom: function () { return m.from; },
          getDate: function () { return m.date; },
          getPlainBody: function () { return m.body; }
        }));
      },
      reply: function (body, opts) {
        t.messages.push({ from: 'sender@example.com', to: t.messages[0].to, date: new Date(), body });
      },
      addLabel: function (label) { /* no-op */ }
    };
  };
  self.simulateInboundReply = function (threadId, fromAddr) {
    const t = self.threads[threadId];
    if (!t) throw new Error('No such thread');
    t.messages.push({ from: fromAddr, to: 'sender@example.com', date: new Date(Date.now() + 1000), body: 'Replying' });
  };
  return self;
}

function FakeSheet(headers, rows) {
  const data = [headers.slice()].concat((rows || []).map(r => r.slice()));
  const self = {};
  self.getDataRange = function () {
    return {
      getValues: function () { return data.map(r => r.slice()); }
    };
  };
  self.appendRow = function (row) { data.push(row.slice()); };
  self.getRange = function (row, col, numRows, numCols) {
    return {
      setValue: function (v) { data[row - 1][col - 1] = v; },
      setValues: function (vs) {
        for (let i = 0; i < (numRows || vs.length); i++) {
          for (let j = 0; j < (numCols || vs[0].length); j++) {
            data[row - 1 + i][col - 1 + j] = vs[i][j];
          }
        }
      },
      getValue: function () { return data[row - 1][col - 1]; },
      getValues: function () {
        const out = [];
        for (let i = 0; i < (numRows || 1); i++) {
          const r = [];
          for (let j = 0; j < (numCols || 1); j++) r.push(data[row - 1 + i][col - 1 + j]);
          out.push(r);
        }
        return out;
      }
    };
  };
  self.getLastRow = function () { return data.length; };
  self.getLastColumn = function () { return data[0] ? data[0].length : 0; };
  self._data = function () { return data; };
  return self;
}
```

- [ ] **Step 3: Syntax check both files**

```
node --check src/Test_runner.gs
node --check src/Test_fakes.gs
```

Expected: no output (syntax OK).

- [ ] **Step 4: Commit**

```bash
git add src/Test_runner.gs src/Test_fakes.gs
git commit -m "Add test runner and fakes (FakeClaude, FakeGmail, FakeSheet)"
```

---

## Task 5: Sheet setup

**Files:**
- Create: `src/SheetSetup.gs`, `src/Test_sheet_setup.gs`

- [ ] **Step 1: Write test first** `src/Test_sheet_setup.gs`

Tests to cover:
- `getOrCreateTab(ss, name)` creates a new tab if absent, returns existing if present.
- `installSheetStructure(ss)` creates all tabs from the embedded schema constant.
- Calling `installSheetStructure` twice does NOT duplicate columns or rows in `Templates` / `Config` (idempotency).
- `Templates` default rows match the schema.

Since we can't easily instantiate a real SpreadsheetApp object in our fake harness, the tests will use a `FakeSpreadsheet` wrapper that supports `getSheetByName`, `insertSheet`, `getSheets`.

Extend `Test_fakes.gs` mentally — but for this task, add a `FakeSpreadsheet` directly here OR extend the fakes file. Cleanest: extend `Test_fakes.gs` with `FakeSpreadsheet` now. Add via Edit; commit together.

```javascript
// src/Test_sheet_setup.gs
registerTest('SheetSetup: creates Brands tab', function () {
  const ss = FakeSpreadsheet();
  installSheetStructure(ss);
  assert(ss.getSheetByName('Brands') !== null, 'Brands tab missing');
});

registerTest('SheetSetup: is idempotent', function () {
  const ss = FakeSpreadsheet();
  installSheetStructure(ss);
  const beforeConfigRows = ss.getSheetByName('Config').getLastRow();
  installSheetStructure(ss);
  const afterConfigRows = ss.getSheetByName('Config').getLastRow();
  assertEqual(afterConfigRows, beforeConfigRows, 'Config rows duplicated on second install');
});

registerTest('SheetSetup: Templates has 4 default rows', function () {
  const ss = FakeSpreadsheet();
  installSheetStructure(ss);
  const lastRow = ss.getSheetByName('Templates').getLastRow();
  assertEqual(lastRow, 5, 'Expected 1 header + 4 default rows');
});

registerTest('SheetSetup: Config has expected keys', function () {
  const ss = FakeSpreadsheet();
  installSheetStructure(ss);
  const config = ss.getSheetByName('Config').getDataRange().getValues();
  const keys = config.slice(1).map(r => r[0]);
  assert(keys.indexOf('anthropic_api_key') !== -1, 'anthropic_api_key missing');
  assert(keys.indexOf('deck_drive_file_id') !== -1, 'deck_drive_file_id missing');
  assert(keys.indexOf('unsubscribe_mailto') !== -1, 'unsubscribe_mailto missing');
});
```

- [ ] **Step 2: Add `FakeSpreadsheet` to `src/Test_fakes.gs`**

```javascript
function FakeSpreadsheet() {
  const self = {};
  const sheets = {};
  self.getSheetByName = function (name) { return sheets[name] || null; };
  self.insertSheet = function (name) {
    const s = FakeSheet([], []);
    s.getName = function () { return name; };
    s.setFrozenRows = function (n) { /* no-op */ };
    s.setColumnWidth = function (i, w) { /* no-op */ };
    sheets[name] = s;
    return s;
  };
  self.getSheets = function () { return Object.keys(sheets).map(n => sheets[n]); };
  return self;
}
```

Also extend `FakeSheet` returned from `insertSheet` to have `setFrozenRows` and `setColumnWidth` no-ops (above).

- [ ] **Step 3: Write `src/SheetSetup.gs`**

Embed the schema JSON as a `const SHEET_SCHEMA = {...}` (copy from `templates/sheet-schema.json`). Implement:

```javascript
function installSheetStructure(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SHEET_SCHEMA.tabs).forEach(function (tabName) {
    const tabSchema = SHEET_SCHEMA.tabs[tabName];
    let sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
      // Headers
      const headers = tabSchema.columns.map(function (c) { return c.header; });
      sheet.appendRow(headers);
      // Default rows
      if (tabSchema.default_rows) {
        tabSchema.default_rows.forEach(function (r) { sheet.appendRow(r); });
      }
      // Frozen rows
      if (tabSchema.frozen_rows) sheet.setFrozenRows(tabSchema.frozen_rows);
      // Column widths
      tabSchema.columns.forEach(function (c, i) {
        if (c.width) sheet.setColumnWidth(i + 1, c.width);
      });
    }
    // Always re-apply dropdowns (cheap, idempotent)
    applyValidations(sheet, tabSchema.columns);
  });
}

function applyValidations(sheet, columns) {
  if (typeof SpreadsheetApp === 'undefined') return; // test env
  columns.forEach(function (col, i) {
    if (col.type === 'dropdown' && col.values && sheet.getMaxRows) {
      const range = sheet.getRange(2, i + 1, Math.max(sheet.getMaxRows() - 1, 1), 1);
      const rule = SpreadsheetApp.newDataValidation().requireValueInList(col.values, true).build();
      range.setDataValidation(rule);
    }
  });
}

function getConfigMap(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Config');
  if (!sheet) return {};
  const values = sheet.getDataRange().getValues();
  const map = {};
  for (let i = 1; i < values.length; i++) {
    map[values[i][0]] = values[i][1];
  }
  return map;
}

function setConfigValue(ss, key, value) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Config');
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value, '']);
}
```

The `SHEET_SCHEMA` constant in `SheetSetup.gs` is a literal JS object — paste the contents of `templates/sheet-schema.json` directly.

- [ ] **Step 4: Syntax check**

```
node --check src/SheetSetup.gs
node --check src/Test_sheet_setup.gs
node --check src/Test_fakes.gs
```

- [ ] **Step 5: Commit**

```bash
git add src/SheetSetup.gs src/Test_sheet_setup.gs src/Test_fakes.gs
git commit -m "Sheet setup with embedded schema + idempotency tests"
```

---

## Task 6: Claude API client

**Files:**
- Create: `src/ClaudeClient.gs`, `src/Test_claude_client.gs`

- [ ] **Step 1: Write test** `src/Test_claude_client.gs`

```javascript
registerTest('ClaudeClient: parses good JSON response', function () {
  const fakeFetch = function (url, opts) {
    return {
      getResponseCode: function () { return 200; },
      getContentText: function () {
        return JSON.stringify({
          content: [{ type: 'text', text: '{"subject":"Hi","body":"Body — Test Sender"}' }]
        });
      }
    };
  };
  const result = callClaude('sys', 'user', 'claude-sonnet-4-6', 'sk-ant-x', fakeFetch);
  assertEqual(result.subject, 'Hi');
  assertContains(result.body, 'Test Sender');
});

registerTest('ClaudeClient: retries once on bad JSON', function () {
  let calls = 0;
  const fakeFetch = function () {
    calls++;
    return {
      getResponseCode: function () { return 200; },
      getContentText: function () {
        return JSON.stringify({
          content: [{ type: 'text', text: calls === 1 ? 'NOT JSON' : '{"subject":"OK","body":"Body — Test Sender"}' }]
        });
      }
    };
  };
  const result = callClaude('sys', 'user', 'claude-sonnet-4-6', 'sk-ant-x', fakeFetch);
  assertEqual(result.subject, 'OK');
  assertEqual(calls, 2);
});

registerTest('ClaudeClient: throws after second bad JSON', function () {
  const fakeFetch = function () {
    return {
      getResponseCode: function () { return 200; },
      getContentText: function () {
        return JSON.stringify({ content: [{ type: 'text', text: 'STILL NOT JSON' }] });
      }
    };
  };
  assertThrows(function () {
    callClaude('sys', 'user', 'claude-sonnet-4-6', 'sk-ant-x', fakeFetch);
  });
});

registerTest('ClaudeClient: throws on 4xx', function () {
  const fakeFetch = function () {
    return {
      getResponseCode: function () { return 401; },
      getContentText: function () { return '{"error":{"message":"bad key"}}'; }
    };
  };
  assertThrows(function () {
    callClaude('sys', 'user', 'claude-sonnet-4-6', 'sk-ant-x', fakeFetch);
  });
});
```

- [ ] **Step 2: Write `src/ClaudeClient.gs`**

```javascript
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const CLAUDE_MAX_TOKENS = 1024;

function callClaude(systemPrompt, userMessage, model, apiKey, fetchImpl) {
  const fetch = fetchImpl || function (url, opts) { return UrlFetchApp.fetch(url, opts); };
  if (!apiKey) throw new Error('Missing anthropic_api_key in Config tab');

  const body = {
    model: model || 'claude-sonnet-4-6',
    max_tokens: CLAUDE_MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }]
  };

  let lastErr = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const resp = fetch(ANTHROPIC_URL, {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION
      },
      payload: JSON.stringify(body),
      muteHttpExceptions: true
    });
    const code = resp.getResponseCode();
    const text = resp.getContentText();
    if (code !== 200) {
      throw new Error('Claude API ' + code + ': ' + text.substring(0, 500));
    }
    let parsed;
    try { parsed = JSON.parse(text); } catch (e) { throw new Error('Claude returned non-JSON envelope'); }
    const content = parsed.content && parsed.content[0] && parsed.content[0].text;
    if (!content) throw new Error('Claude returned empty content');
    try {
      const obj = JSON.parse(content);
      if (typeof obj.subject !== 'string' || typeof obj.body !== 'string') {
        throw new Error('Claude JSON missing subject or body');
      }
      return obj;
    } catch (e) {
      lastErr = e;
      // retry once
      continue;
    }
  }
  throw new Error('Claude returned malformed content after 2 attempts: ' + (lastErr && lastErr.message));
}
```

- [ ] **Step 3: Syntax check**

```
node --check src/ClaudeClient.gs
node --check src/Test_claude_client.gs
```

- [ ] **Step 4: Commit**

```bash
git add src/ClaudeClient.gs src/Test_claude_client.gs
git commit -m "Claude API client with JSON-output enforcement and 1-retry logic"
```

---

## Task 7: Outreach core — generate + send

**Files:**
- Create: `src/Outreach.gs`, `src/Test_outreach.gs`

This task covers `generateDraft` and `sendDraft`. `processFollowUps` is Task 8.

- [ ] **Step 1: Write tests** `src/Test_outreach.gs`

Tests:
- `generateDraft` writes `draft_subject` and `draft_body` to the right row, sets status to `drafted`.
- `generateDraft` calls Claude with the brand context system prompt and a user message containing the brand fields.
- `generateDraft` marks `draft_failed` on Claude error.
- `sendDraft` appends signature, business address, and unsubscribe (CASL footer) to the body.
- `sendDraft` calls Gmail with the correct recipient, subject, body, and attaches the deck file.
- `sendDraft` sets status to `sent`, increments `sent_count`, sets `last_action_date` and `next_action_date`, captures `thread_id`.
- `sendDraft` fails fast on invalid email format → status `invalid_email`, no API calls.

```javascript
registerTest('Outreach: generateDraft writes subject and body to row', function () {
  const ss = FakeSpreadsheet();
  installSheetStructure(ss);
  const brands = ss.getSheetByName('Brands');
  brands.appendRow(['Lululemon','lululemon.com','Apparel','Calvin Chestnut','calvin@lulu.com','VP Marketing','','queued','','','','','','',0,'']);
  const fakeClaude = FakeClaude({ nextResponse: { subject: 'Pickleball x Lulu', body: 'Hi Calvin — Test Sender' }});
  const config = { sender_name: 'Test Sender', anthropic_api_key: 'sk', anthropic_model: 'claude-sonnet-4-6' };
  generateDraftForRow(ss, 2, { claude: fakeClaude.call, configOverride: config });
  const row = brands.getDataRange().getValues()[1];
  assertEqual(row[7], 'drafted', 'status not drafted');
  assertContains(row[8], 'Pickleball', 'subject not written');
  assertContains(row[9], 'Test Sender', 'body not written');
});

registerTest('Outreach: generateDraft marks draft_failed on Claude error', function () {
  const ss = FakeSpreadsheet();
  installSheetStructure(ss);
  const brands = ss.getSheetByName('Brands');
  brands.appendRow(['Lululemon','lululemon.com','Apparel','Calvin','calvin@lulu.com','VP','','queued','','','','','','',0,'']);
  const fakeClaude = FakeClaude({ shouldThrow: true });
  const config = { sender_name: 'Test Sender', anthropic_api_key: 'sk', anthropic_model: 'claude-sonnet-4-6' };
  try { generateDraftForRow(ss, 2, { claude: fakeClaude.call, configOverride: config }); } catch (e) {}
  const row = brands.getDataRange().getValues()[1];
  assertEqual(row[7], 'draft_failed');
});

registerTest('Outreach: sendDraft appends CASL footer', function () {
  const ss = FakeSpreadsheet();
  installSheetStructure(ss);
  setConfigValue(ss, 'sender_name', 'Zach');
  setConfigValue(ss, 'sender_title', 'Outreach, TUPC');
  setConfigValue(ss, 'sender_signature', 'Zach\nTUPC');
  setConfigValue(ss, 'business_address', '123 Maple Ave, Toronto');
  setConfigValue(ss, 'unsubscribe_mailto', 'mailto:opt@out.com');
  setConfigValue(ss, 'deck_drive_file_id', 'fake_file_id');
  const brands = ss.getSheetByName('Brands');
  brands.appendRow(['Lulu','lulu.com','Apparel','Calvin','calvin@lulu.com','VP','','drafted','Subj','Body — Zach','','','','',0,'']);
  const fakeGmail = FakeGmail();
  const fakeDrive = { getFileById: function () { return { getBlob: function () { return 'fake_blob'; }, getName: function () { return 'deck.pdf'; } }; } };
  sendDraftForRow(ss, 2, { gmail: fakeGmail, drive: fakeDrive });
  assertEqual(fakeGmail.sent.length, 1);
  assertContains(fakeGmail.sent[0].plainBody, '123 Maple Ave, Toronto');
  assertContains(fakeGmail.sent[0].plainBody, 'mailto:opt@out.com');
  assertContains(fakeGmail.sent[0].plainBody, 'Zach\nTUPC');
});

registerTest('Outreach: sendDraft advances status and counters', function () {
  const ss = FakeSpreadsheet();
  installSheetStructure(ss);
  setConfigValue(ss, 'sender_name', 'Zach');
  setConfigValue(ss, 'sender_signature', 'Zach');
  setConfigValue(ss, 'business_address', 'TO');
  setConfigValue(ss, 'unsubscribe_mailto', 'mailto:x@y.com');
  setConfigValue(ss, 'deck_drive_file_id', 'f');
  const brands = ss.getSheetByName('Brands');
  brands.appendRow(['Lulu','lulu.com','Apparel','Calvin','calvin@lulu.com','VP','','drafted','Subj','Body — Zach','','','','',0,'']);
  const fakeGmail = FakeGmail();
  const fakeDrive = { getFileById: function () { return { getBlob: function () { return 'fb'; }, getName: function () { return 'd.pdf'; } }; } };
  sendDraftForRow(ss, 2, { gmail: fakeGmail, drive: fakeDrive });
  const row = brands.getDataRange().getValues()[1];
  assertEqual(row[7], 'sent');
  assertEqual(row[14], 1, 'sent_count not incremented');
  assert(row[10] !== '', 'last_action_date not set');
  assert(row[11] !== '', 'next_action_date not set');
  assert(row[13] !== '', 'thread_id not captured');
});

registerTest('Outreach: invalid email short-circuits', function () {
  const ss = FakeSpreadsheet();
  installSheetStructure(ss);
  const brands = ss.getSheetByName('Brands');
  brands.appendRow(['Lulu','lulu.com','Apparel','Calvin','not-an-email','VP','','queued','','','','','','',0,'']);
  const fakeClaude = FakeClaude();
  const fakeGmail = FakeGmail();
  const config = { sender_name: 'Z', anthropic_api_key: 'sk' };
  try { generateDraftForRow(ss, 2, { claude: fakeClaude.call, configOverride: config }); } catch (e) {}
  assertEqual(fakeClaude.calls.length, 0);
  const row = brands.getDataRange().getValues()[1];
  assertEqual(row[7], 'invalid_email');
});
```

- [ ] **Step 2: Write `src/Outreach.gs`**

Includes:
- `BRAND_CONTEXT` constant (the full content of `templates/tupc-brand-context.md` pasted in as a JS string)
- Email regex validator
- Column index lookups by header name (so column reordering doesn't break logic)
- `generateDraftForRow(ss, rowIndex, opts)` — opts can override claude, gmail, drive, configOverride for testing
- `sendDraftForRow(ss, rowIndex, opts)`
- Helper to build the user-facing prompt from a Brands row + Templates row for a given stage
- Helper to compose the full email body (Claude body + signature + CASL footer)
- Status transitions table

Full skeleton (~150 lines). Key signatures:

```javascript
const BRAND_CONTEXT = `…the contents of templates/tupc-brand-context.md…`;

const STATUS = {
  QUEUED: 'queued', DRAFTED: 'drafted', SENT: 'sent',
  FOLLOW_UP_1: 'follow_up_1', FOLLOW_UP_2: 'follow_up_2',
  REPLIED: 'replied', MEETING_BOOKED: 'meeting_booked', WON: 'won',
  DEAD: 'dead', DRAFT_FAILED: 'draft_failed', SEND_FAILED: 'send_failed',
  INVALID_EMAIL: 'invalid_email'
};

const STAGE_AFTER = {
  [STATUS.SENT]: 'follow_up_1',
  [STATUS.FOLLOW_UP_1]: 'follow_up_2',
  [STATUS.FOLLOW_UP_2]: 'breakup'
};

function isValidEmail(e) {
  return typeof e === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
}

function getColIndex(sheet, headerName) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idx = headers.indexOf(headerName);
  if (idx === -1) throw new Error('Missing column: ' + headerName);
  return idx + 1; // 1-based
}

function readBrandRow(sheet, rowIndex) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
  const out = {};
  headers.forEach(function (h, i) { out[normalizeHeader(h)] = row[i]; });
  return out;
}

function normalizeHeader(h) {
  return String(h).toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

function writeBrandCell(sheet, rowIndex, key, value) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  for (let i = 0; i < headers.length; i++) {
    if (normalizeHeader(headers[i]) === key || headers[i] === key) {
      sheet.getRange(rowIndex, i + 1).setValue(value);
      return;
    }
  }
  throw new Error('Unknown column: ' + key);
}

function generateDraftForRow(ss, rowIndex, opts) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  opts = opts || {};
  const brands = ss.getSheetByName('Brands');
  const config = opts.configOverride || getConfigMap(ss);
  const row = readBrandRow(brands, rowIndex);

  if (!isValidEmail(row.contact_email)) {
    writeBrandCell(brands, rowIndex, 'status', STATUS.INVALID_EMAIL);
    throw new Error('Invalid contact_email: ' + row.contact_email);
  }

  const stage = row.status === STATUS.QUEUED ? 'initial' : (STAGE_AFTER[row.status] || 'initial');
  const userMessage = buildUserPrompt(row, stage, config);
  const claudeCall = opts.claude || function (sys, user, model, key) {
    return callClaude(sys, user, model, key);
  };

  try {
    const result = claudeCall(BRAND_CONTEXT, userMessage, config.anthropic_model || 'claude-sonnet-4-6', config.anthropic_api_key);
    writeBrandCell(brands, rowIndex, 'draft_subject', result.subject);
    writeBrandCell(brands, rowIndex, 'draft_body', result.body);
    writeBrandCell(brands, rowIndex, 'status', STATUS.DRAFTED);
    return result;
  } catch (e) {
    writeBrandCell(brands, rowIndex, 'status', STATUS.DRAFT_FAILED);
    throw e;
  }
}

function buildUserPrompt(row, stage, config) {
  const lines = [
    'Brand: ' + row.company + ' (' + row.category + ')',
    'Website: ' + (row.website || 'n/a'),
    'Recipient: ' + (row.contact_name || 'team') + ', ' + (row.contact_role || ''),
    row.pitch_angle ? 'Pitch angle: ' + row.pitch_angle : 'Pitch angle: (infer one — tie to ' + row.category + ' x pickleball)',
    'Stage: ' + stage,
    'Sender: ' + (config.sender_name || '[sender]') + ', ' + (config.sender_title || ''),
    '',
    'Return STRICT JSON: {"subject":"<60 chars max","body":"<email body, plain text, ≤120 words, must include sender name>"}'
  ];
  return lines.join('\n');
}

function composeFullBody(claudeBody, config) {
  const parts = [
    claudeBody,
    '',
    '—',
    config.sender_signature || '',
    '',
    'Toronto United Pickleball Club',
    config.business_address || '',
    '',
    'To stop receiving these emails: ' + (config.unsubscribe_mailto || '')
  ];
  return parts.join('\n');
}

function sendDraftForRow(ss, rowIndex, opts) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  opts = opts || {};
  const brands = ss.getSheetByName('Brands');
  const config = opts.configOverride || getConfigMap(ss);
  const row = readBrandRow(brands, rowIndex);

  if (!isValidEmail(row.contact_email)) {
    writeBrandCell(brands, rowIndex, 'status', STATUS.INVALID_EMAIL);
    throw new Error('Invalid contact_email: ' + row.contact_email);
  }

  const subject = row.draft_subject;
  const body = row.draft_body;
  if (!subject || !body) throw new Error('No draft to send for row ' + rowIndex);

  const fullBody = composeFullBody(body, config);
  const gmail = opts.gmail || GmailApp;
  const drive = opts.drive || DriveApp;
  const attachments = [];
  if (config.deck_drive_file_id) {
    try { attachments.push(drive.getFileById(config.deck_drive_file_id).getBlob()); } catch (e) {
      // continue without attachment; warn in notes
      writeBrandCell(brands, rowIndex, 'notes', (row.notes || '') + '\n[deck attach failed: ' + e.message + ']');
    }
  }
  const cc = config.cc_emails || '';

  let threadId = '';
  try {
    if (row.thread_id) {
      // Reply on existing thread (for follow-ups; not used here in initial sendDraft)
      gmail.getThreadById(row.thread_id).reply(fullBody, { attachments: attachments, cc: cc });
      threadId = row.thread_id;
    } else {
      const sendResult = gmail.sendEmail(row.contact_email, subject, fullBody, {
        attachments: attachments,
        cc: cc,
        name: config.sender_name || ''
      });
      // GmailApp.sendEmail returns void in production; for our fake it returns {threadId}.
      // In production, find the just-sent thread:
      threadId = sendResult && sendResult.threadId ? sendResult.threadId : findRecentSentThreadId(gmail, row.contact_email, subject);
    }
  } catch (e) {
    writeBrandCell(brands, rowIndex, 'status', STATUS.SEND_FAILED);
    throw e;
  }

  const today = new Date();
  const followUpOffset = getTemplateOffset(ss, 'follow_up_1');
  const nextDate = new Date(today.getTime() + followUpOffset * 24 * 60 * 60 * 1000);

  writeBrandCell(brands, rowIndex, 'status', STATUS.SENT);
  writeBrandCell(brands, rowIndex, 'last_action_date', today);
  writeBrandCell(brands, rowIndex, 'next_action_date', nextDate);
  writeBrandCell(brands, rowIndex, 'thread_id', threadId);
  writeBrandCell(brands, rowIndex, 'sends', (row.sends || 0) + 1);
  writeBrandCell(brands, rowIndex, 'draft_subject', '');
  writeBrandCell(brands, rowIndex, 'draft_body', '');
}

function findRecentSentThreadId(gmail, recipient, subject) {
  // Used only in production; in tests, fake returns threadId from sendEmail
  if (typeof GmailApp === 'undefined') return '';
  Utilities.sleep(2000); // give Gmail a moment to register the send
  const query = 'in:sent to:' + recipient + ' newer_than:1d';
  const threads = GmailApp.search(query, 0, 5);
  for (let i = 0; i < threads.length; i++) {
    if (threads[i].getFirstMessageSubject() === subject) return threads[i].getId();
  }
  return threads[0] ? threads[0].getId() : 'MISSING';
}

function getTemplateOffset(ss, stage) {
  const sheet = ss.getSheetByName('Templates');
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === stage) return Number(values[i][1]) || 0;
  }
  return 4; // fallback
}
```

Note: the schema header is `Sent Count` (column key normalizes to `sent_count`); this was set in Task 3.

- [ ] **Step 3: Syntax check**

```
node --check src/Outreach.gs
node --check src/Test_outreach.gs
```

- [ ] **Step 4: Commit**

```bash
git add src/Outreach.gs src/Test_outreach.gs templates/sheet-schema.json
git commit -m "Outreach: generateDraftForRow + sendDraftForRow with CASL footer"
```

---

## Task 8: Outreach — processFollowUps

**Files:**
- Modify: `src/Outreach.gs`, `src/Test_outreach.gs`

- [ ] **Step 1: Add tests** to `src/Test_outreach.gs`

Tests:
- `processFollowUps` advances rows with `next_action_date <= today` and `status in sent/follow_up_1/follow_up_2`.
- After `follow_up_2` → breakup send, row's status becomes `dead`.
- `daily_send_cap` short-circuits before invoking Claude when cap reached.
- Rows past `sent_count >= 4` are not processed.

```javascript
registerTest('Outreach: processFollowUps advances sent → follow_up_1', function () {
  const ss = FakeSpreadsheet();
  installSheetStructure(ss);
  setConfigValue(ss, 'sender_name', 'Z');
  setConfigValue(ss, 'sender_signature', 'Z');
  setConfigValue(ss, 'business_address', 'TO');
  setConfigValue(ss, 'unsubscribe_mailto', 'mailto:x@y.com');
  setConfigValue(ss, 'deck_drive_file_id', 'f');
  setConfigValue(ss, 'anthropic_api_key', 'sk');
  setConfigValue(ss, 'daily_send_cap', '30');
  const brands = ss.getSheetByName('Brands');
  const yesterday = new Date(Date.now() - 86400000);
  brands.appendRow(['Lulu','','Apparel','Calvin','calvin@lulu.com','VP','','sent','','',yesterday,yesterday,'','t_1',1,'']);
  const fakeClaude = FakeClaude({ nextResponse: { subject: 'Bump', body: 'Bumping — Z' }});
  const fakeGmail = FakeGmail();
  fakeGmail.threads['t_1'] = { messages: [{ from: 'sender@example.com', to: 'calvin@lulu.com', date: yesterday, body: 'old' }] };
  const fakeDrive = { getFileById: function () { return { getBlob: function () { return 'fb'; }, getName: function () { return 'd.pdf'; } }; } };
  processFollowUps(ss, { claude: fakeClaude.call, gmail: fakeGmail, drive: fakeDrive });
  const row = brands.getDataRange().getValues()[1];
  assertEqual(row[7], 'follow_up_1');
});

registerTest('Outreach: processFollowUps breakup → dead', function () {
  const ss = FakeSpreadsheet();
  installSheetStructure(ss);
  setConfigValue(ss, 'sender_name', 'Z');
  setConfigValue(ss, 'sender_signature', 'Z');
  setConfigValue(ss, 'business_address', 'TO');
  setConfigValue(ss, 'unsubscribe_mailto', 'mailto:x@y.com');
  setConfigValue(ss, 'deck_drive_file_id', 'f');
  setConfigValue(ss, 'anthropic_api_key', 'sk');
  const brands = ss.getSheetByName('Brands');
  const yesterday = new Date(Date.now() - 86400000);
  brands.appendRow(['Lulu','','Apparel','Calvin','calvin@lulu.com','VP','','follow_up_2','','',yesterday,yesterday,'','t_2',3,'']);
  const fakeClaude = FakeClaude({ nextResponse: { subject: 'Last note', body: 'Last note — Z' }});
  const fakeGmail = FakeGmail();
  fakeGmail.threads['t_2'] = { messages: [{ from: 'sender@example.com', to: 'calvin@lulu.com', date: yesterday, body: 'old' }] };
  const fakeDrive = { getFileById: function () { return { getBlob: function () { return 'fb'; }, getName: function () { return 'd.pdf'; } }; } };
  processFollowUps(ss, { claude: fakeClaude.call, gmail: fakeGmail, drive: fakeDrive });
  const row = brands.getDataRange().getValues()[1];
  assertEqual(row[7], 'dead');
});

registerTest('Outreach: processFollowUps respects daily_send_cap', function () {
  const ss = FakeSpreadsheet();
  installSheetStructure(ss);
  setConfigValue(ss, 'sender_name', 'Z');
  setConfigValue(ss, 'sender_signature', 'Z');
  setConfigValue(ss, 'business_address', 'TO');
  setConfigValue(ss, 'unsubscribe_mailto', 'mailto:x@y.com');
  setConfigValue(ss, 'deck_drive_file_id', 'f');
  setConfigValue(ss, 'anthropic_api_key', 'sk');
  setConfigValue(ss, 'daily_send_cap', '1');
  const brands = ss.getSheetByName('Brands');
  const today = new Date();
  brands.appendRow(['A','','Apparel','x','a@a.com','VP','','sent','','',today,today,'','t_a',1,'']);
  brands.appendRow(['B','','Apparel','y','b@b.com','VP','','sent','','',today,today,'','t_b',1,'']);
  const fakeClaude = FakeClaude({ nextResponse: { subject: 's', body: 'b — Z' }});
  const fakeGmail = FakeGmail();
  fakeGmail.threads['t_a'] = { messages: [{ from: 'sender@example.com', to: 'a@a.com', date: today, body: 'o' }] };
  fakeGmail.threads['t_b'] = { messages: [{ from: 'sender@example.com', to: 'b@b.com', date: today, body: 'o' }] };
  const fakeDrive = { getFileById: function () { return { getBlob: function () { return ''; }, getName: function () { return 'd'; } }; } };
  // Pretend today's sends already at cap (cap=1, one row has last_action_date=today and status=sent)
  processFollowUps(ss, { claude: fakeClaude.call, gmail: fakeGmail, drive: fakeDrive });
  assertEqual(fakeClaude.calls.length, 0, 'Claude was called despite cap reached');
});
```

- [ ] **Step 2: Add `processFollowUps` to `src/Outreach.gs`**

```javascript
function processFollowUps(ss, opts) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  opts = opts || {};
  const brands = ss.getSheetByName('Brands');
  const config = opts.configOverride || getConfigMap(ss);
  const cap = parseInt(config.daily_send_cap || '30', 10);

  const values = brands.getDataRange().getValues();
  const headers = values[0];
  const idx = function (h) { return headers.indexOf(h); };

  // Count today's sends
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let sentToday = 0;
  for (let i = 1; i < values.length; i++) {
    const lastAction = values[i][idx('Last Action')];
    if (lastAction instanceof Date && lastAction >= todayStart) sentToday++;
  }
  if (sentToday >= cap) {
    console.log('Daily send cap reached: ' + sentToday + '/' + cap);
    return;
  }

  // Find rows due
  const due = [];
  for (let i = 1; i < values.length; i++) {
    const status = values[i][idx('Status')];
    const nextAction = values[i][idx('Next Action')];
    const sentCount = Number(values[i][idx('Sent Count')] || 0);
    if (
      (status === STATUS.SENT || status === STATUS.FOLLOW_UP_1 || status === STATUS.FOLLOW_UP_2) &&
      nextAction instanceof Date && nextAction <= today &&
      sentCount < 4
    ) {
      due.push({ rowIndex: i + 1, nextAction: nextAction });
    }
  }
  due.sort(function (a, b) { return a.nextAction - b.nextAction; });

  for (let j = 0; j < due.length; j++) {
    if (sentToday >= cap) break;
    try {
      sendFollowUpForRow(ss, due[j].rowIndex, opts);
      sentToday++;
    } catch (e) {
      console.error('Follow-up failed for row ' + due[j].rowIndex + ': ' + e.message);
    }
  }
}

function sendFollowUpForRow(ss, rowIndex, opts) {
  opts = opts || {};
  const brands = ss.getSheetByName('Brands');
  const config = opts.configOverride || getConfigMap(ss);
  const row = readBrandRow(brands, rowIndex);

  const nextStage = STAGE_AFTER[row.status];
  if (!nextStage) throw new Error('No follow-up stage after ' + row.status);

  const userMessage = buildUserPrompt(row, nextStage, config);
  const claudeCall = opts.claude || function (sys, user, model, key) { return callClaude(sys, user, model, key); };
  const result = claudeCall(BRAND_CONTEXT, userMessage, config.anthropic_model || 'claude-sonnet-4-6', config.anthropic_api_key);

  const fullBody = composeFullBody(result.body, config);
  const gmail = opts.gmail || GmailApp;
  const drive = opts.drive || DriveApp;
  const attachments = [];
  if (config.deck_drive_file_id) {
    try { attachments.push(drive.getFileById(config.deck_drive_file_id).getBlob()); } catch (e) {}
  }

  gmail.getThreadById(row.thread_id).reply(fullBody, { attachments: attachments, cc: config.cc_emails || '' });

  const today = new Date();
  const newStatus = nextStage === 'breakup' ? STATUS.DEAD : (nextStage === 'follow_up_1' ? STATUS.FOLLOW_UP_1 : STATUS.FOLLOW_UP_2);
  const nextOffset = nextStage === 'breakup' ? 0 : getTemplateOffset(ss, nextStage === 'follow_up_1' ? 'follow_up_2' : 'breakup');
  const nextDate = nextStage === 'breakup' ? '' : new Date(today.getTime() + nextOffset * 24 * 60 * 60 * 1000);

  writeBrandCell(brands, rowIndex, 'status', newStatus);
  writeBrandCell(brands, rowIndex, 'last_action_date', today);
  if (nextDate) writeBrandCell(brands, rowIndex, 'next_action_date', nextDate);
  writeBrandCell(brands, rowIndex, 'sent_count', (row.sent_count || 0) + 1);
}
```

- [ ] **Step 3: Syntax check + commit**

```
node --check src/Outreach.gs
node --check src/Test_outreach.gs
```

```bash
git add src/Outreach.gs src/Test_outreach.gs
git commit -m "Outreach: processFollowUps with send-cap short-circuit"
```

---

## Task 9: Gmail reply scanner

**Files:**
- Create: `src/GmailScanner.gs`, `src/Test_gmail_scanner.gs`

- [ ] **Step 1: Tests**

```javascript
registerTest('GmailScanner: flips status to replied when inbound message after last outbound', function () {
  const ss = FakeSpreadsheet();
  installSheetStructure(ss);
  const brands = ss.getSheetByName('Brands');
  const sent = new Date(Date.now() - 3600000);
  brands.appendRow(['Lulu','','Apparel','Calvin','calvin@lulu.com','VP','','sent','','',sent,sent,'','t_1',1,'']);
  const fakeGmail = FakeGmail();
  fakeGmail.threads['t_1'] = { messages: [{ from: 'sender@example.com', to: 'calvin@lulu.com', date: sent, body: 'out' }] };
  fakeGmail.simulateInboundReply('t_1', 'calvin@lulu.com');
  scanForReplies(ss, { gmail: fakeGmail, senderEmail: 'sender@example.com' });
  const row = brands.getDataRange().getValues()[1];
  assertEqual(row[7], 'replied');
  assert(row[12] !== '', 'reply_at not set');
});

registerTest('GmailScanner: ignores threads where only outbound exists', function () {
  const ss = FakeSpreadsheet();
  installSheetStructure(ss);
  const brands = ss.getSheetByName('Brands');
  const sent = new Date(Date.now() - 3600000);
  brands.appendRow(['Lulu','','Apparel','Calvin','calvin@lulu.com','VP','','sent','','',sent,sent,'','t_1',1,'']);
  const fakeGmail = FakeGmail();
  fakeGmail.threads['t_1'] = { messages: [{ from: 'sender@example.com', to: 'calvin@lulu.com', date: sent, body: 'out' }] };
  scanForReplies(ss, { gmail: fakeGmail, senderEmail: 'sender@example.com' });
  const row = brands.getDataRange().getValues()[1];
  assertEqual(row[7], 'sent', 'status changed without inbound reply');
});

registerTest('GmailScanner: skips rows in terminal states', function () {
  const ss = FakeSpreadsheet();
  installSheetStructure(ss);
  const brands = ss.getSheetByName('Brands');
  brands.appendRow(['Lulu','','Apparel','Calvin','calvin@lulu.com','VP','','dead','','','','','','t_1',2,'']);
  const fakeGmail = FakeGmail();
  fakeGmail.threads['t_1'] = { messages: [
    { from: 'sender@example.com', to: 'calvin@lulu.com', date: new Date(), body: 'out' },
    { from: 'calvin@lulu.com', to: 'sender@example.com', date: new Date(Date.now() + 1000), body: 'in' }
  ]};
  scanForReplies(ss, { gmail: fakeGmail, senderEmail: 'sender@example.com' });
  const row = brands.getDataRange().getValues()[1];
  assertEqual(row[7], 'dead', 'terminal state was changed');
});
```

- [ ] **Step 2: Implementation `src/GmailScanner.gs`**

```javascript
const TERMINAL_STATUSES = ['replied','meeting_booked','won','dead','invalid_email','send_failed','draft_failed'];
const REPLIED_LABEL = 'TUPC/Replied';

function scanForReplies(ss, opts) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  opts = opts || {};
  const brands = ss.getSheetByName('Brands');
  const gmail = opts.gmail || GmailApp;
  const senderEmail = opts.senderEmail || (typeof Session !== 'undefined' ? Session.getActiveUser().getEmail() : '');
  if (!senderEmail) throw new Error('scanForReplies needs a sender email; pass opts.senderEmail or run in a context with Session access.');

  const values = brands.getDataRange().getValues();
  const headers = values[0];
  const idx = function (h) { return headers.indexOf(h); };

  for (let i = 1; i < values.length; i++) {
    const threadId = values[i][idx('Thread ID')];
    const status = values[i][idx('Status')];
    if (!threadId || TERMINAL_STATUSES.indexOf(status) !== -1) continue;
    try {
      const thread = gmail.getThreadById(threadId);
      if (!thread) continue;
      const messages = thread.getMessages();
      let lastOutbound = null;
      let firstInboundAfter = null;
      for (let m = 0; m < messages.length; m++) {
        const from = String(messages[m].getFrom() || '').toLowerCase();
        const date = messages[m].getDate();
        if (from.indexOf(senderEmail.toLowerCase()) !== -1) {
          if (!lastOutbound || date > lastOutbound) lastOutbound = date;
        } else if (lastOutbound && date > lastOutbound && !firstInboundAfter) {
          firstInboundAfter = date;
          break;
        }
      }
      if (firstInboundAfter) {
        brands.getRange(i + 1, idx('Status') + 1).setValue('replied');
        brands.getRange(i + 1, idx('Reply At') + 1).setValue(firstInboundAfter);
        if (thread.addLabel && typeof GmailApp !== 'undefined') {
          try {
            let label = GmailApp.getUserLabelByName(REPLIED_LABEL) || GmailApp.createLabel(REPLIED_LABEL);
            thread.addLabel(label);
          } catch (e) { /* non-fatal */ }
        }
      }
    } catch (e) {
      console.error('scanForReplies error on row ' + (i + 1) + ': ' + e.message);
    }
  }
}
```

- [ ] **Step 3: Syntax check + commit**

```bash
node --check src/GmailScanner.gs
node --check src/Test_gmail_scanner.gs
git add src/GmailScanner.gs src/Test_gmail_scanner.gs
git commit -m "Reply scanner: compare actual Gmail timestamps, skip terminal states"
```

---

## Task 10: Time-based triggers

**Files:**
- Create: `src/Triggers.gs`

- [ ] **Step 1: Write `src/Triggers.gs`**

```javascript
const TRIGGER_HANDLERS = ['triggerProcessFollowUps', 'triggerScanForReplies'];

function installTimeTriggers() {
  uninstallTimeTriggers();
  ScriptApp.newTrigger('triggerProcessFollowUps')
    .timeBased().everyDays(1).atHour(9).create();
  ScriptApp.newTrigger('triggerScanForReplies')
    .timeBased().everyHours(1).create();
}

function uninstallTimeTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function (t) {
    if (TRIGGER_HANDLERS.indexOf(t.getHandlerFunction()) !== -1) {
      ScriptApp.deleteTrigger(t);
    }
  });
}

function triggerProcessFollowUps() { processFollowUps(); }
function triggerScanForReplies() { scanForReplies(); }
```

- [ ] **Step 2: Syntax check + commit**

```bash
node --check src/Triggers.gs
git add src/Triggers.gs
git commit -m "Time-based triggers: daily follow-ups, hourly reply scan"
```

---

## Task 11: Main entry + menu

**Files:**
- Create: `src/Main.gs`, `src/Sidebar.html`

- [ ] **Step 1: Write `src/Main.gs`**

```javascript
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  const config = getConfigMap();
  if (!config.anthropic_api_key) {
    ui.createMenu('🎾 TUPC Outreach')
      .addItem('Run setup wizard', 'showSetupWizard')
      .addToUi();
  } else {
    ui.createMenu('🎾 TUPC Outreach')
      .addItem('Generate draft for selected row', 'menuGenerateDraft')
      .addItem('Send selected row', 'menuSendDraft')
      .addSeparator()
      .addItem('Process follow-ups now', 'menuProcessFollowUps')
      .addItem('Scan for replies now', 'menuScanReplies')
      .addSeparator()
      .addItem('Re-install Sheet structure', 'menuInstallSheets')
      .addItem('Re-install time triggers', 'installTimeTriggers')
      .addItem('Open setup wizard', 'showSetupWizard')
      .addToUi();
  }
}

function menuGenerateDraft() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const row = SpreadsheetApp.getActiveRange().getRow();
  if (row < 2) { SpreadsheetApp.getUi().alert('Select a brand row first.'); return; }
  try {
    generateDraftForRow(ss, row);
    showDraftSidebar(row);
  } catch (e) {
    SpreadsheetApp.getUi().alert('Draft failed: ' + e.message);
  }
}

function menuSendDraft() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const row = SpreadsheetApp.getActiveRange().getRow();
  if (row < 2) { SpreadsheetApp.getUi().alert('Select a brand row first.'); return; }
  const ui = SpreadsheetApp.getUi();
  const resp = ui.alert('Send email for row ' + row + '?', ui.ButtonSet.YES_NO);
  if (resp !== ui.Button.YES) return;
  try {
    sendDraftForRow(ss, row);
    ui.alert('Sent.');
  } catch (e) {
    ui.alert('Send failed: ' + e.message);
  }
}

function menuProcessFollowUps() {
  try {
    processFollowUps();
    SpreadsheetApp.getUi().alert('Follow-ups processed.');
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error: ' + e.message);
  }
}

function menuScanReplies() {
  try {
    scanForReplies();
    SpreadsheetApp.getUi().alert('Reply scan complete.');
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error: ' + e.message);
  }
}

function menuInstallSheets() {
  installSheetStructure();
  SpreadsheetApp.getUi().alert('Sheet structure installed.');
}

function showDraftSidebar(rowIndex) {
  const tmpl = HtmlService.createTemplateFromFile('Sidebar');
  tmpl.rowIndex = rowIndex;
  const html = tmpl.evaluate().setTitle('Draft preview');
  SpreadsheetApp.getUi().showSidebar(html);
}

function getDraftForRow(rowIndex) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const row = readBrandRow(ss.getSheetByName('Brands'), rowIndex);
  return { subject: row.draft_subject, body: row.draft_body, contact_email: row.contact_email, company: row.company };
}

function saveDraftEdits(rowIndex, subject, body) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const brands = ss.getSheetByName('Brands');
  writeBrandCell(brands, rowIndex, 'draft_subject', subject);
  writeBrandCell(brands, rowIndex, 'draft_body', body);
}

function sendDraftFromSidebar(rowIndex) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  sendDraftForRow(ss, rowIndex);
  return 'Sent';
}
```

- [ ] **Step 2: Write `src/Sidebar.html`**

A minimal HTML sidebar with two editable fields (subject, body) and a Send button. Calls `google.script.run` to load/save/send.

```html
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <style>
    body { font-family: -apple-system, sans-serif; padding: 12px; font-size: 13px; }
    label { display: block; margin-top: 12px; font-weight: 600; color: #555; }
    input, textarea { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; font-family: inherit; font-size: 13px; }
    textarea { min-height: 220px; }
    .meta { color: #888; margin-bottom: 8px; font-size: 12px; }
    button { margin-top: 16px; padding: 10px 16px; background: #14633e; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; }
    button:hover { background: #0f4d30; }
    button:disabled { opacity: 0.5; }
    .status { margin-top: 12px; font-size: 12px; color: #14633e; }
  </style>
</head>
<body>
  <div class="meta">Row <?= rowIndex ?></div>
  <div id="meta2" class="meta"></div>
  <label>Subject</label>
  <input type="text" id="subject" />
  <label>Body</label>
  <textarea id="body"></textarea>
  <button onclick="save()">Save edits</button>
  <button onclick="send()">Send now</button>
  <div class="status" id="status"></div>
  <script>
    const rowIndex = <?= rowIndex ?>;
    google.script.run.withSuccessHandler(function (d) {
      document.getElementById('subject').value = d.subject || '';
      document.getElementById('body').value = d.body || '';
      document.getElementById('meta2').textContent = 'To: ' + (d.contact_email || '') + ' — ' + (d.company || '');
    }).getDraftForRow(rowIndex);

    function save() {
      const s = document.getElementById('subject').value;
      const b = document.getElementById('body').value;
      google.script.run.withSuccessHandler(function () {
        document.getElementById('status').textContent = 'Saved.';
      }).saveDraftEdits(rowIndex, s, b);
    }
    function send() {
      save();
      document.getElementById('status').textContent = 'Sending...';
      google.script.run
        .withSuccessHandler(function () {
          document.getElementById('status').textContent = 'Sent.';
        })
        .withFailureHandler(function (e) {
          document.getElementById('status').textContent = 'Error: ' + e.message;
        })
        .sendDraftFromSidebar(rowIndex);
    }
  </script>
</body>
</html>
```

- [ ] **Step 3: Syntax check + commit**

```bash
node --check src/Main.gs
git add src/Main.gs src/Sidebar.html
git commit -m "Main menu + draft review sidebar"
```

---

## Task 12: Setup wizard

**Files:**
- Create: `src/SetupWizard.gs`, `src/SetupSidebar.html`

- [ ] **Step 1: Write `src/SetupWizard.gs`**

```javascript
function showSetupWizard() {
  installSheetStructure();
  const html = HtmlService.createHtmlOutputFromFile('SetupSidebar').setTitle('TUPC Outreach setup');
  SpreadsheetApp.getUi().showSidebar(html);
}

function setupGetConfig() { return getConfigMap(); }

function setupSaveConfig(updates) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(updates).forEach(function (k) {
    setConfigValue(ss, k, updates[k]);
  });
}

function setupInstallTriggers() {
  installTimeTriggers();
  return 'Triggers installed.';
}

function setupSendTestEmail() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const config = getConfigMap(ss);
  const me = Session.getActiveUser().getEmail();
  if (!me) throw new Error('No active user email');
  const body = composeFullBody('This is a test email from your TUPC outreach tool. If you can read this, sending works.', config);
  GmailApp.sendEmail(me, '[TUPC test] Outreach tool wired up', body, { name: config.sender_name || 'TUPC Outreach' });
  return 'Test email sent to ' + me;
}
```

- [ ] **Step 2: Write `src/SetupSidebar.html`**

A small multi-step form: API key, sender name, sender title, signature, CC, deck file ID, business address, unsubscribe mailto. Buttons: Save → Install triggers → Send test.

```html
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <style>
    body { font-family: -apple-system, sans-serif; padding: 12px; font-size: 13px; }
    h2 { color: #14633e; font-size: 16px; margin-top: 0; }
    label { display: block; margin-top: 10px; font-weight: 600; color: #555; }
    input, textarea { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; font-family: inherit; font-size: 13px; }
    textarea { min-height: 80px; }
    button { margin-top: 12px; padding: 8px 14px; background: #14633e; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; }
    .status { margin-top: 12px; font-size: 12px; color: #14633e; }
    small { color: #888; }
  </style>
</head>
<body>
  <h2>TUPC Outreach setup</h2>
  <label>Anthropic API key</label>
  <input type="password" id="anthropic_api_key" placeholder="sk-ant-…" />
  <label>Your name</label>
  <input type="text" id="sender_name" />
  <label>Your title</label>
  <input type="text" id="sender_title" />
  <label>Signature</label>
  <textarea id="sender_signature"></textarea>
  <label>CC emails (comma-separated)</label>
  <input type="text" id="cc_emails" placeholder="rliorti@gmail.com" />
  <label>Deck Drive file ID <small>(from the share URL)</small></label>
  <input type="text" id="deck_drive_file_id" />
  <label>Business address</label>
  <input type="text" id="business_address" />
  <label>Unsubscribe mailto</label>
  <input type="text" id="unsubscribe_mailto" />
  <button onclick="save()">Save</button>
  <button onclick="installTriggers()">Install triggers</button>
  <button onclick="sendTest()">Send test email to me</button>
  <div class="status" id="status"></div>
  <script>
    const FIELDS = ['anthropic_api_key','sender_name','sender_title','sender_signature','cc_emails','deck_drive_file_id','business_address','unsubscribe_mailto'];
    google.script.run.withSuccessHandler(function (cfg) {
      FIELDS.forEach(function (k) {
        const el = document.getElementById(k);
        if (el && cfg[k] !== undefined) el.value = cfg[k];
      });
    }).setupGetConfig();

    function save() {
      const updates = {};
      FIELDS.forEach(function (k) { updates[k] = document.getElementById(k).value; });
      google.script.run.withSuccessHandler(function () {
        document.getElementById('status').textContent = 'Saved.';
      }).setupSaveConfig(updates);
    }
    function installTriggers() {
      google.script.run.withSuccessHandler(function (msg) {
        document.getElementById('status').textContent = msg;
      }).setupInstallTriggers();
    }
    function sendTest() {
      document.getElementById('status').textContent = 'Sending...';
      google.script.run
        .withSuccessHandler(function (msg) { document.getElementById('status').textContent = msg; })
        .withFailureHandler(function (e) { document.getElementById('status').textContent = 'Error: ' + e.message; })
        .setupSendTestEmail();
    }
  </script>
</body>
</html>
```

- [ ] **Step 3: Syntax check + commit**

```bash
node --check src/SetupWizard.gs
git add src/SetupWizard.gs src/SetupSidebar.html
git commit -m "Setup wizard: paste config, install triggers, send test email"
```

---

## Task 13: Documentation

**Files:**
- Create: `README.md`, `docs/HANDOFF.md`, `docs/ZACH_QUICKSTART.md`

- [ ] **Step 1: Write `README.md`** (~150 lines)

Sections:
- What this is (one paragraph)
- Architecture diagram (ASCII)
- Quick links to HANDOFF and ZACH_QUICKSTART
- Local dev (clasp setup, push, pull)
- License (MIT)

- [ ] **Step 2: Write `docs/HANDOFF.md`** — Lucas's setup steps

1. Create a new Google Sheet (call it "TUPC Outreach").
2. Tools → Apps Script → paste in script ID OR run `npm install && cp appsscript.json src/ && npx clasp login && npx clasp create --type sheets --title "TUPC Outreach" --rootDir ./src` (then update `.clasp.json` with the script ID).
3. `npm run push` to upload all files.
4. Reload the Sheet. Click **🎾 TUPC Outreach → Run setup wizard**.
5. In the wizard: paste your Anthropic API key, fill in Zach's name/title/signature, paste the Drive file ID of the deck PDF, set business address, hit Save → Install triggers → Send test email. Confirm the test email arrives.
6. Share the Sheet with Zach (editor permission). Send him the link to `docs/ZACH_QUICKSTART.md`.

Include screenshots if available; otherwise text-only is fine.

- [ ] **Step 3: Write `docs/ZACH_QUICKSTART.md`** — Zach's day-1 guide

1. Open the Sheet Lucas shared with you.
2. First time only: click **🎾 TUPC Outreach → Run setup wizard**, then click "Authorize" when Google asks. Click "Send test email to me" to confirm it works.
3. To add a brand: go to the **Brands** tab, add a row with company, contact info, category.
4. Select the row, click **🎾 TUPC Outreach → Generate draft for selected row**. Wait ~5 seconds. A sidebar opens with the draft.
5. Edit if you want; click **Send now**.
6. Follow-ups run automatically at 9am daily. Replies are detected hourly — you'll see status flip to `replied`. Stop the sequence by setting status to `meeting_booked` or `won` manually.
7. Manual buttons in the menu: "Process follow-ups now", "Scan for replies now" — use these if you want to run something immediately.

- [ ] **Step 4: Commit**

```bash
git add README.md docs/HANDOFF.md docs/ZACH_QUICKSTART.md
git commit -m "Documentation: README + HANDOFF + ZACH_QUICKSTART"
```

---

## Task 14: GitHub repo

**Files:**
- Configure remote

- [ ] **Step 1: Sanity-check the build**

Run `node --check` on every `.gs` file in `src/`:

```bash
for f in src/*.gs; do node --check "$f"; done
```

Expected: no errors.

- [ ] **Step 2: Create GitHub repo + push**

```bash
gh repo create lucasreydman/tupc-outreach --public --source=. --remote=origin --description "Cold sponsorship outreach automation for Toronto United Pickleball Club"
git push -u origin main
```

- [ ] **Step 3: Verify**

```bash
gh repo view lucasreydman/tupc-outreach --web
```

Confirm the README renders, the spec/plan are visible, and there are no committed secrets (the `.gitignore` excludes `.clasp.json`).

---

## Done

After Task 14, hand off to Lucas. Lucas executes `docs/HANDOFF.md` once to set up a real Sheet + Apps Script project. After verifying the test email arrives, Lucas shares the Sheet with Zach and points him at `docs/ZACH_QUICKSTART.md`.
