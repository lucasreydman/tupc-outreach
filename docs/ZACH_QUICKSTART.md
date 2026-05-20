# Zach's quick-start

5-minute read. You'll be sending your first outreach email by the end of it.

## What this tool does

- You add target brands to a Google Sheet.
- You click **Generate draft** — Claude writes a personalized email referencing that brand and attaches the TUPC deck.
- You click **Send** — the email goes from your Gmail, with the deck attached, CC'd to Ricky.
- The Sheet tracks who you've contacted and automatically flips a row to `replied` when someone responds.
- That's the whole loop. There are no automated follow-ups — if a brand doesn't reply to the initial email, they're done.

## First time only

1. Open the Sheet Lucas shared with you.
2. Click the menu **🎾 TUPC Outreach → Run setup wizard**.
3. Google will ask you to authorize the script. Hit **Allow** twice (it needs Gmail to send and Sheets to track).
4. Most of your config is already filled in. Click **Send test to me** — a test email should arrive in ~30 seconds. If yes, you're set.

## Day-to-day

### Adding brands

Go to the **Brands** tab. Add a row per contact:

| Column | What to put |
|--------|-------------|
| Company | "Lululemon" |
| Website | "lululemon.com" |
| Category | Pick from the dropdown — Apparel, Retail, etc. |
| Contact Name | "Calvin Chestnut" |
| Contact Email | their work email |
| Contact Role | "VP Marketing" |
| Pitch Angle | Optional. If you have a specific angle (e.g., "their new athleisure line"), drop it here. Claude will weave it in. Leave blank to let Claude figure it out from category alone. |
| Status | Leave as `queued`. |

You can leave the rest of the columns blank — the tool fills them in.

### Sending an email

1. Click the brand's row.
2. Menu → **🎾 TUPC Outreach → Generate draft for selected row.**
3. Wait ~5–10 seconds. A sidebar opens with the draft (subject + body).
4. Read it. Edit if you want — change the opener, tweak the activation idea, anything.
5. Click **Send now** in the sidebar.

That's it. The email goes out from your Gmail with the deck attached, CC'd to Ricky. You can knock through 10–30 of these in an afternoon.

### When someone replies

Every hour the tool scans your Gmail for replies on sent threads. When it finds one:

- Status flips to `replied`.
- The Gmail thread gets the label `TUPC/Replied` so you can spot it in your inbox.

After you've had a conversation, you can manually update the row's status:

- `meeting_booked` — call is on the calendar.
- `won` — they signed.
- `dead` — they passed.

### Where to look

- **Brands tab** — your full pipeline. One row per contact.
- **Dashboard tab** — running counts (sent, open, replied, meetings, win rate).
- **Config tab** — your settings (API key, sender info, deck file). Set-and-forget after setup.

## Things to know

- **Generate ≠ send.** Generating a draft does NOT send it. Always click Send in the sidebar.
- **You can edit any email before sending.** The first draft is a starting point.
- **If a draft looks off**, click Generate again — Claude regenerates it. Use the Pitch Angle column to give it a steer.
- **Replies show in your Gmail normally.** The Sheet just tracks the status; you reply from Gmail like any other email.
- **No follow-ups.** This tool sends ONE email per brand. If you want to follow up manually, reply on the existing Gmail thread — but the tool won't auto-do that.

## When something looks broken

| What you see | What to do |
|--------------|------------|
| "Draft failed" | Click Generate again. If it keeps failing, ping Lucas. |
| Menu disappeared | Reload the Sheet (close the tab, reopen). |
| Setup wizard keeps appearing | The API key in Config is empty — open the wizard and paste it back. |
| Row stuck in `send_failed` | Email bounced or hit a Gmail limit. Check your Gmail Sent folder; if the email isn't there, click Send again. |

For anything weirder, ping Lucas with a screenshot and the row number.

Go book some meetings.
