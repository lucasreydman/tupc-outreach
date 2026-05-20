# TUPC Outreach

A cold sponsorship outreach tool for [Toronto United Pickleball Club](https://www.cnplleague.com/) (CNPL). Built as a Google Sheet + Apps Script + Anthropic Claude — no separate backend, no hosting, no deployment. The Sheet is the CRM; Claude writes every email fresh per brand; Gmail does the sending.

## What it does

- Manages a list of target sponsorship brands in a Google Sheet.
- Generates a personalized cold email per brand via Claude — fresh every time, brand-specific opener, one tailored activation idea, signed by the operator.
- Attaches the TUPC sponsorship deck PDF automatically.
- Sequences follow-ups (T+4, T+10, T+20 by default) and stops when a recipient replies.
- Tracks open conversations, replies, meetings, and partnerships in a simple Dashboard tab.
- All CASL-compliant (Canadian anti-spam): sender identity, business address, and unsubscribe link in every email.

## How it's wired

```
┌──────────────────────────────────────────────────────────────┐
│                    Google Sheet (UI + data)                  │
│  ┌──────────┐  ┌───────────┐  ┌────────┐  ┌──────────────┐   │
│  │ Brands   │  │ Templates │  │ Config │  │  Dashboard   │   │
│  └──────────┘  └───────────┘  └────────┘  └──────────────┘   │
└──────────────────────────────┬───────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                │   Apps Script (logic)       │
                │  • Custom menu              │
                │  • Setup wizard             │
                │  • Draft generator          │
                │  • Send / attach            │
                │  • Daily follow-up trigger  │
                │  • Hourly reply scanner     │
                └──────────────┬──────────────┘
                               │
              ┌────────────────┼────────────────┐
     ┌────────▼────────┐  ┌────▼────┐  ┌────────▼────────┐
     │ Anthropic API   │  │  Gmail  │  │  Google Drive   │
     │ (Sonnet 4.6)    │  │         │  │  (deck PDF)     │
     └─────────────────┘  └─────────┘  └─────────────────┘
```

## Repo layout

```
src/                          # Apps Script source (clasp pushes from here)
  Main.gs                     # Custom menu, sidebar entry
  SetupWizard.gs              # First-run config flow
  Outreach.gs                 # generateDraft / sendDraft / processFollowUps
  ClaudeClient.gs             # Anthropic Messages API wrapper
  GmailScanner.gs             # Reply detection
  SheetSetup.gs               # Idempotent Sheet structure installer
  Triggers.gs                 # Daily + hourly time triggers
  Sidebar.html                # Draft review sidebar
  SetupSidebar.html           # First-run wizard sidebar
  Test_*.gs                   # In-Sheet test suite (40+ tests)

templates/
  tupc-brand-context.md       # Claude system prompt (source of truth)
  sheet-schema.json           # Canonical Sheet structure

docs/
  HANDOFF.md                  # Setup instructions for the operator
  ZACH_QUICKSTART.md          # Day-1 guide for the daily user
  superpowers/                # Design spec + implementation plan

scripts/
  check-syntax.js             # Local .gs syntax check
  run-tests.js                # Local test runner (uses vm sandbox)
  sync-manifest.js            # Copies appsscript.json into src/ before push

appsscript.json               # OAuth scopes + manifest
.clasp.json.template          # Clasp config template (without script ID)
package.json                  # @google/clasp as dev dep
```

## Getting started

If you're handing this off, see **[docs/HANDOFF.md](docs/HANDOFF.md)**.
If you're using it day-to-day, see **[docs/ZACH_QUICKSTART.md](docs/ZACH_QUICKSTART.md)**.

## Local development

Run the test suite locally (no Google account required):

```bash
node scripts/run-tests.js
```

Syntax-check all `.gs` files:

```bash
node scripts/check-syntax.js
```

Push to a real Apps Script project (requires `clasp login` first):

```bash
npm install
cp .clasp.json.template .clasp.json   # then paste in your script ID
npm run push
```

## Tech

- Google Apps Script (V8 runtime)
- Anthropic Claude (Sonnet 4.6 by default; configurable)
- `@google/clasp` for source-mirroring

## License

MIT.
