# Setup guide (read this whole thing before you start)

This is the one-time technical setup. After this, the daily user (Zach) just opens the Sheet — no terminal, no code. The setup itself takes about 30 minutes the first time, mostly waiting for things to install.

**You do NOT need to know how to code.** Every step below tells you exactly what to type or click and what to expect to see.

---

## What you're about to do, in plain English

1. Install two free tools on your computer (Node.js + Git).
2. Get an API key from Anthropic (the company that makes Claude).
3. Download this code from GitHub.
4. Sign in to Google through a command-line tool called `clasp`.
5. Create a new Google Sheet that has the outreach code attached to it.
6. Open that Sheet, paste in your settings, and send a test email.
7. Share the Sheet with the person who'll use it daily.

That's it. The "code" part is just files getting copied into Google's servers. Once it's set up, everything happens inside the Sheet.

---

## Prerequisites

You need:

1. **A computer running Windows or macOS.** Steps for both are given below.
2. **A Google account** — this is the account that will *send* the outreach emails. It can be a personal Gmail (`name@gmail.com`) or a Workspace account (`name@yourcompany.com`). The setup uses the same account throughout.
3. **About $5–10 in API credit** at Anthropic. Realistically you'll spend $0.50–2 per month at the volume this tool sends.
4. **30 minutes of focused time.**

You do NOT need:
- Programming experience.
- A paid Google Workspace account (free Gmail works fine).
- A custom email domain.
- A web server / hosting account.

---

## Step 1 — Install Node.js

Node.js is a free runtime that lets your computer run the setup commands. It's a one-time install.

### On Windows

1. Open **https://nodejs.org/** in your browser.
2. Click the big green **LTS** button (current version 20 or 22 — either works).
3. The download is an `.msi` file. Double-click it when it finishes.
4. Click **Next** through every screen. Leave defaults checked.
5. When it asks about "Tools for Native Modules," **uncheck** that box — you don't need them.
6. Click **Install**. Approve any Windows security prompts.
7. When it says "Completed," click **Finish**.

To confirm it installed: open **Start menu → search "PowerShell" → click it**. In the black/blue window that opens, type:

```
node --version
```

Press Enter. You should see something like `v22.5.1`. If you do, Node.js is installed. If you get "command not found," restart your computer and try again.

### On macOS

1. Open **https://nodejs.org/** in your browser.
2. Click the green **LTS** button.
3. The download is a `.pkg` file. Double-click it when it finishes.
4. Click through Continue → Continue → Agree → Install. Enter your Mac password when asked.
5. When it finishes, click **Close**.

To confirm: open **Terminal** (press `⌘ + Space`, type "Terminal," hit Enter). Type:

```
node --version
```

Press Enter. You should see something like `v22.5.1`. If yes, you're good.

---

## Step 2 — Install Git

Git is the tool that downloads code from GitHub.

### On Windows

1. Open **https://git-scm.com/download/win** — the download starts automatically.
2. Run the `.exe` installer.
3. Click **Next** through every screen. Defaults are fine. Don't touch anything.
4. Click **Install**, then **Finish**.

Confirm in PowerShell:

```
git --version
```

You should see `git version 2.x.x`.

### On macOS

1. Open **Terminal** and type:

```
git --version
```

2. If git isn't installed, macOS will pop up a window saying "The 'git' command requires the command line developer tools. Would you like to install the tools now?" — click **Install**, agree to the terms, and wait ~5 minutes.
3. After it's done, run `git --version` again — you should see the version number.

---

## Step 3 — Get an Anthropic API key

This is the key that lets the tool talk to Claude (the AI that writes the emails).

1. Open **https://console.anthropic.com/** in your browser.
2. Click **Sign up** (or Sign in if you already have an account). Use any email — your personal Gmail is fine.
3. Verify your email if prompted.
4. After signing in, click **Settings** in the left sidebar → **Billing** → **Add credits**. Add $5–10 to start. You can use Apple Pay, a credit card, etc. *You will not be charged a subscription — you're just adding prepaid credit.*
5. Click **API Keys** in the left sidebar → **Create Key**.
6. Name it `tupc-outreach`. Click **Create Key**.
7. A long string starting with `sk-ant-` appears. **Copy it now and paste it into a text file you can find later** — Anthropic will not show it to you again after you close this window. (If you lose it, you can just make a new one — but you have to do it on the spot.)

You'll paste this key into the Sheet in Step 8.

---

## Step 4 — Download the code

### On Windows (PowerShell)

Open PowerShell (Start → search "PowerShell" → click). Run these commands one at a time, pressing Enter after each:

```
cd $HOME
git clone https://github.com/lucasreydman/tupc-outreach.git
cd tupc-outreach
npm install
```

Each step:
- `cd $HOME` — moves you to your home folder (e.g., `C:\Users\YourName`).
- `git clone …` — downloads the code into a folder called `tupc-outreach`. Takes ~10 seconds.
- `cd tupc-outreach` — moves you into that folder.
- `npm install` — downloads the dev tool we need (`clasp`). Takes 1–3 minutes. You'll see a wall of text scroll by. When the prompt comes back (you see `PS C:\Users\YourName\tupc-outreach>`), it's done.

If `npm install` shows red error text, scroll up — usually it's a network issue. Try again. If it keeps failing, see Troubleshooting at the bottom.

### On macOS (Terminal)

Open Terminal. Run:

```
cd ~
git clone https://github.com/lucasreydman/tupc-outreach.git
cd tupc-outreach
npm install
```

Same as above. Wait for `npm install` to finish.

---

## Step 5 — Sign in to Google with `clasp`

`clasp` is the tool that connects your computer to Google's Apps Script. You need to authorize it once.

In the same terminal window (PowerShell or Terminal), run:

```
npx clasp login
```

What happens:
1. A line appears that says "Logging in globally..." followed by a long URL.
2. Your web browser opens automatically. If it doesn't, copy the URL from the terminal and paste it into your browser.
3. You'll see a Google sign-in page. **Sign in with the Google account you want the outreach emails to be sent from.** This is important — whichever account you sign in with here is the one that will send.
4. Google will warn you about "an unverified app." Click **Advanced** → **Go to clasp (unsafe)**. (This is normal for personal Apps Script tools — clasp is Google's own CLI but they still show this warning.)
5. Approve the permissions.
6. The browser tab will say **Logged in! You may close this tab.**
7. Back in the terminal, you should see a green message like **You are logged in as your.email@gmail.com.**

If you accidentally sign in with the wrong account: run `npx clasp logout`, then `npx clasp login` again.

---

## Step 6 — Enable the Apps Script API

**Do this BEFORE the next step.** Skipping it causes the `clasp create` command to fail halfway through, which leaves an empty orphan Sheet in your Drive that you'd have to clean up by hand.

1. Open **https://script.google.com/home/usersettings** in your browser.
2. Make sure you're signed in to the same Google account you used for `clasp login`.
3. Toggle the **Google Apps Script API** switch to **ON**.
4. Wait ~30 seconds for the toggle to propagate.

---

## Step 7 — Create the bound Sheet + Apps Script project

This creates a brand-new Google Sheet with the outreach code attached. Run:

```
npx clasp create --type sheets --title "TUPC Outreach" --rootDir ./src
```

What happens:
1. A new Google Sheet is created in your Google Drive, titled **TUPC Outreach**.
2. A new Apps Script project is created and attached to that Sheet.
3. A file called `.clasp.json` is written — it records the script's unique ID.
4. The terminal prints two URLs — one for the Sheet, one for the Apps Script editor. **Don't click them yet** — there's no code uploaded.

> 🛟 **If you skipped Step 6 and got "User has not enabled the Apps Script API":** the failed attempt still created an empty Sheet in your Drive. Open https://drive.google.com/, find the empty **TUPC Outreach** Sheet (no menu after reload), right-click → Move to trash. Then enable the API per Step 6 and retry this step.

---

## Step 8 — Push the code to Google

This uploads all the outreach code into the Apps Script project you just created. Run:

```
npm run push
```

What happens:
1. `Synced appsscript.json -> src/appsscript.json`.
2. (If needed) `Moved .clasp.json from src/ to project root` — newer clasp versions sometimes write the config in the wrong place; the script auto-corrects this.
3. `Pushing files...` followed by a list of files.
4. `Pushed N files.` (around 15 files).
5. If it asks **"Manifest file has been updated. Do you want to push and overwrite?"** — type `y` and press Enter.

---

## Step 9 — Open the Sheet

Run:

```
npx clasp open --addon
```

This opens the bound Google Sheet in your browser. If the command fails, you can also:

1. Go to **https://drive.google.com/**
2. Sign in (same Google account you used for clasp).
3. You'll see a Sheet called **TUPC Outreach**. Double-click it.

The Sheet might still look empty. That's fine — the next step fills it in.

---

## Step 10 — Upload the deck PDF and copy its file ID

1. The deck PDF is in the GitHub repo, at the path `Toronto United Pickleball Club 2026 Deck.pdf`. Drag it from your local `tupc-outreach` folder into your **Google Drive** (any folder, but remember where you put it).
2. After it uploads, **right-click the PDF** in Drive → **Get link** → **Copy link**.
3. The link looks like this:
   ```
   https://drive.google.com/file/d/1aB2cD3eF4gH5iJ6kL7mN8oP9qR0sT1uV/view?usp=sharing
   ```
4. **The file ID is the part between `/d/` and `/view`.** In the example above, it's `1aB2cD3eF4gH5iJ6kL7mN8oP9qR0sT1uV`.
5. Copy that ID — just the ID, not the whole URL.

Make sure the link sharing is set to **"Anyone with the link can view"** — otherwise the script won't be able to attach the PDF when Zach isn't the sender. Or, alternately, the PDF must be owned by the same account that sends the emails (which it is, since you uploaded it).

---

## Step 11 — Run the setup wizard inside the Sheet

1. Go back to the **TUPC Outreach** Sheet. **Reload the page** (Cmd/Ctrl + R) — this is necessary so the menu loads.
2. In the menu bar above the Sheet, you should see **🎾 TUPC Outreach** between "Help" and the row of icons. If you don't see it, wait 10 seconds and reload again. (The first load can take up to 30 seconds while Google compiles the script.)
3. Click **🎾 TUPC Outreach → Run setup wizard.**
4. Google will pop up an **Authorization required** dialog. Click **Continue.**
5. Sign in with your Google account (same one you used for clasp).
6. You'll see **"Google hasn't verified this app."** Click **Advanced → Go to TUPC Outreach (unsafe).** (This is fine — the script is yours, you just haven't paid Google $75 to certify it.)
7. Click **Allow** to approve Gmail / Drive / Sheets permissions.
8. The setup wizard sidebar opens on the right.

Fill in the wizard:

- **Anthropic API key** — paste the `sk-ant-...` key from Step 3.
- **Your name** — the daily user's full name (e.g., `Zach Lastname`).
- **Your title** — already filled in as `Outreach, Toronto United Pickleball Club`. Leave or edit.
- **Signature** — multi-line. Example:
  ```
  Zach Lastname
  Outreach, Toronto United Pickleball Club
  zach@tupcpickleball.com
  ```
- **CC emails** — defaults to `rliorti@gmail.com` (Ricky stays in the loop). Edit if needed.
- **Deck Drive file ID** — paste the ID from Step 9.
- **Business address** — defaults to `Toronto, ON, Canada`. Required for Canada's anti-spam law (CASL).
- **Unsubscribe mailto** — defaults to a mailto link. Required for CASL.

Click **Save**. The status line at the bottom should say "Saved."

Click **Install triggers**. Status should say "Triggers installed (daily follow-ups at 9am, reply scan hourly)."

Click **Send test to me**. Within 30 seconds, you should receive an email from yourself titled **[TUPC test] Outreach tool wired up.** That confirms the whole stack is working.

If the test email doesn't arrive:
- Check your spam folder.
- Open the Apps Script editor (**Extensions → Apps Script** from the Sheet menu, or `npx clasp open` from the terminal). Click **Executions** in the left sidebar to see error logs.
- Most common error: missing Drive file permissions. Make the deck PDF "Anyone with the link can view" in Drive.

---

## Step 12 — Share the Sheet with the daily user

1. In the Sheet, click the **Share** button (top right).
2. Add the daily user's email (Zach's).
3. Set permission to **Editor**.
4. Optionally uncheck "Notify people" if you'll tell them directly.
5. Click **Send** (or **Share** if you unchecked notify).

Send Zach the Sheet's URL and a link to **[ZACH_QUICKSTART.md](ZACH_QUICKSTART.md)**. He's a one-click user from here on.

> ⚠ **Security note:** The Anthropic API key is stored in the Sheet's **Config** tab. Anyone with Editor or Viewer access on the Sheet can read it. Only share with people you trust. If a key ever leaks, go to the Anthropic console and revoke it.

---

## You're done

That's it. The tool runs itself: Zach adds brands, clicks Generate, clicks Send. The daily follow-ups and reply scanner run automatically in the background.

If you ever need to update the code (bug fix, feature), just `cd tupc-outreach`, `git pull`, then `npm run push`. The Sheet picks up the changes immediately.

---

## Troubleshooting

| What you see | What it means | What to do |
|---|---|---|
| `git: command not found` | Git isn't installed or restart is needed | Re-do Step 2; restart computer. |
| `npm: command not found` | Node.js isn't installed | Re-do Step 1; restart computer. |
| `npm install` errors with `ENOENT` or network errors | Network issue | Try again. Try a different Wi-Fi. |
| `clasp` errors with `User has not enabled the Apps Script API` | Apps Script API needs to be flipped on | Visit https://script.google.com/home/usersettings, toggle ON, retry. |
| `clasp login` opens browser but never returns | Browser didn't redirect back to localhost | Make sure no firewall is blocking; try again. Worst case, run `npx clasp login --no-localhost` and paste the auth code manually. |
| Menu `🎾 TUPC Outreach` doesn't appear in the Sheet | `onOpen()` didn't run yet | Reload the Sheet (Cmd/Ctrl + R). Wait 30s and reload again. |
| "Authorization required" loops forever | You're signed into the wrong Google account in the browser | Sign out of all Google accounts in the browser, sign in with the right one, reload Sheet. |
| Test email doesn't arrive | Check Apps Script execution logs | Sheet → Extensions → Apps Script → Executions tab. Usually a missing config value or Drive permission. |
| Setup wizard keeps reappearing | API key in Config tab is empty | Run wizard again, paste key, click Save. |
| `Pushed N files` succeeds but Sheet has no menu | Apps Script project isn't bound to this Sheet | Re-run Step 6 — `npx clasp create --type sheets ...` — and `npm run push`. |
| Anthropic returns 401 | Bad API key | Generate a new key in Anthropic Console, paste into Config tab, save. |
| Anthropic returns 429 | Rate limited or out of credits | Add credits at https://console.anthropic.com/settings/billing. |

If you're truly stuck: open an issue at https://github.com/lucasreydman/tupc-outreach/issues with the error message and what you were doing.

---

## Quick reference — common commands

Run these from inside the `tupc-outreach` folder in PowerShell or Terminal.

| Command | What it does |
|---|---|
| `npm run push` | Re-uploads code after edits |
| `npx clasp open --addon` | Opens the bound Sheet |
| `npx clasp open` | Opens the Apps Script editor (for logs / debugging) |
| `npx clasp logs` | Shows recent execution logs |
| `git pull` | Downloads the latest code from GitHub |
| `node scripts/run-tests.js` | Runs all 40 unit tests locally |
