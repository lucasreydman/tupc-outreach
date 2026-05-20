# Hand-off guide

This is the one-time setup. Once you finish these steps, share the Sheet with Zach and point him at [`ZACH_QUICKSTART.md`](ZACH_QUICKSTART.md).

## Prerequisites

- Node.js 18+ installed.
- A Google account (the one the outreach emails will be sent FROM — typically Zach's Workspace account or a `team@tupcpickleball.com` alias).
- An Anthropic API key from <https://console.anthropic.com/>.
- The TUPC 2026 deck PDF uploaded to that account's Google Drive.

## Steps

### 1. Clone the repo and install

```bash
git clone https://github.com/lucasreydman/tupc-outreach.git
cd tupc-outreach
npm install
```

### 2. Create the bound Google Sheet + Apps Script project

Sign in to clasp using the Google account that will own the Sheet:

```bash
npx clasp login
```

Create a new Sheet-bound Apps Script project:

```bash
npx clasp create --type sheets --title "TUPC Outreach" --rootDir ./src
```

That generates `.clasp.json` with the new script ID. Open it and confirm `"rootDir": "./src"` is set (clasp sometimes writes an absolute path — set it to `./src` if so).

### 3. Push the source

```bash
npm run push
```

This copies `appsscript.json` into `src/` (so clasp picks up the OAuth scopes) and uploads every `.gs` and `.html` file in `src/` to the script.

### 4. Open the bound Sheet

```bash
npx clasp open --addon
```

Or open the Apps Script editor with `npx clasp open` and from there: `View → Show Apps Script dashboard → click the project name → "Container" link`. Either way, you'll land on the actual Google Sheet that backs this project.

### 5. Upload the deck PDF and grab the file ID

Upload `Toronto United Pickleball Club 2026 Deck.pdf` to the Google account's Drive. Open it, copy the file ID from the URL (the part between `/d/` and `/view`).

### 6. Run the setup wizard

In the Sheet:

1. Click **🎾 TUPC Outreach → Run setup wizard** in the menu bar. (If you don't see the menu, reload the Sheet — `onOpen()` only fires on load.)
2. Paste these into the wizard sidebar:
   - **Anthropic API key** — `sk-ant-…`
   - **Your name** — Zach's full name
   - **Your title** — defaults to "Outreach, Toronto United Pickleball Club"
   - **Signature** — multi-line, like:
     ```
     Zach Lastname
     Outreach, Toronto United Pickleball Club
     416-XXX-XXXX
     ```
   - **CC emails** — `rliorti@gmail.com` (so Ricky stays in the loop)
   - **Deck Drive file ID** — paste from step 5
   - **Business address** — `Toronto, ON, Canada` (required for CASL)
   - **Unsubscribe mailto** — defaults to `mailto:rliorti@gmail.com?subject=Unsubscribe` (required for CASL)
3. Click **Save**.
4. Click **Install triggers** (sets up the daily 9am follow-up job and the hourly reply scanner).
5. Click **Send test to me** — you should receive a test email within ~30 seconds. If it doesn't arrive, check the Apps Script execution log (`View → Logs` in the editor) for errors.

### 7. Share the Sheet with Zach

`File → Share` → add Zach's email as an Editor.

> ⚠ **Security note:** The Anthropic API key lives in the `Config` tab. Anyone with Editor or Viewer access can read it. If that bothers you, restrict access to Zach only (no link-sharing), and rotate the key if it ever leaks.

### 8. Verify the tests pass (optional but recommended)

In the Apps Script editor: open `Test_runner.gs`, select the `runAllTests` function from the dropdown, click ▶ Run. You'll be prompted to authorize once. Results land in a new `Test Results` tab.

Expected: **40 PASS, 0 FAIL.**

## Sending Zach the link

```
Hey — your TUPC outreach tool is ready. Open this Sheet:
<paste Sheet URL>

Read the 1-pager here: <link to ZACH_QUICKSTART.md>

The first time you open it, click the menu "🎾 TUPC Outreach"
and Google will ask you to authorize. Hit Allow.

That's it — you're set.
```

## When something goes wrong

| Symptom | Look at |
|---------|---------|
| Menu doesn't appear | Reload the Sheet; `onOpen()` only fires on full load. |
| "Missing anthropic_api_key" | Open setup wizard, paste it, click Save. |
| "Invalid contact_email" | Brands row has a malformed email — fix the row, set status back to `queued`. |
| Draft fails with API error | Check Apps Script logs (`View → Logs` in the editor) for the actual Claude response. Usually rate limit, bad key, or out of credits. |
| Send works but no thread_id captured | Gmail search race — extremely rare. Row will be marked `thread_id = MISSING` and follow-ups will be skipped for that row. Send manually if needed. |
| Time triggers stopped running | Run `installTimeTriggers` from the menu's "Re-install time triggers" item. |
| Sheet structure looks wrong | Run "Re-install Sheet structure" from the menu. Idempotent — safe to run anytime. |
