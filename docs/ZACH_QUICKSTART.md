# Zach's quick-start

Welcome. This is a 5-minute read; you'll be sending your first outreach email by the end of it.

## What this tool does

- You add target brands to a Google Sheet.
- You click "Generate draft" — Claude writes a personalized email referencing that brand, attaches our deck, and shows it to you for review.
- You click "Send" — the email goes from your Gmail, with our deck attached.
- The tool automatically sends two follow-ups (after 4 days, then 10 days) and a polite breakup (after 20 days) if they don't reply.
- When someone replies, the sequence stops automatically and you'll see their row turn yellow (status = `replied`).

## First time only

1. Open the Sheet Lucas shared with you.
2. Click the menu **🎾 TUPC Outreach → Run setup wizard**.
3. Google will ask you to authorize the script. Hit **Allow** and **Allow** again (it needs Gmail to send and Sheets to track).
4. Most of your config is already filled in. Just click **Send test to me** — you should see a test email arrive in ~30 seconds. If yes, you're set.

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
| Pitch Angle | Optional. If you have a specific angle (e.g., "their new athleisure line for active 30s"), drop it here. Claude will weave it in. Leave blank to let Claude figure it out from category alone. |
| Status | Leave as `queued`. |

You can leave the rest of the columns blank — the tool fills them in.

### Sending an email

1. Click the brand's row.
2. Menu → **🎾 TUPC Outreach → Generate draft for selected row.**
3. Wait ~5–10 seconds. A sidebar opens with the draft (subject + body).
4. Read it. Edit if you want — change the opener, tweak the activation idea, anything.
5. Click **Send now** in the sidebar.

That's the whole loop. The email goes out from your Gmail with the deck PDF attached, CC'd to Ricky.

### Follow-ups (automatic)

Every morning at 9am the tool checks if anyone is due for a follow-up and sends it. You don't have to do anything.

- 4 days after the initial email → follow-up 1.
- 10 more days → follow-up 2.
- 20 more days → polite breakup. After that the row goes `dead`.
- If they reply at any point, the sequence stops.

### When someone replies

Every hour the tool scans Gmail for replies on your sent threads. When it finds one:

- Status flips to `replied`.
- The Gmail thread gets the label `TUPC/Replied` so you can spot it in your inbox.
- Follow-ups stop for that row.

After you've had a conversation, you can manually update the row's status:

- `meeting_booked` — you've got a call on the calendar.
- `won` — they signed up.
- `dead` — they passed.

### Where to look

- **Brands tab** — your full pipeline.
- **Dashboard tab** — counts (sent this week, open conversations, replies, meetings, win rate).
- **Templates tab** — the prompts Claude uses for each follow-up stage. Edit them if you want to change the tone of follow-ups.
- **Config tab** — your settings (API key, sender info, deck file). Mostly set-and-forget.

## Things to know

- **Cap is 30 sends/day** by default. If you hit it, follow-ups defer to tomorrow. Bump it in the Config tab if you need more headroom.
- **Don't blast 50 emails in one minute.** Spread them out — better deliverability, more replies.
- **You can edit any email before sending.** The first draft is a starting point.
- **You can skip the auto follow-up sequence** by manually changing a row's status to `replied`, `meeting_booked`, `won`, or `dead`.
- **If a draft looks off**, click Generate again — Claude regenerates it. Use the Pitch Angle column to give it a steer.

## When something looks broken

| What you see | What to do |
|--------------|------------|
| "Draft failed" | Click Generate again. If it keeps failing, ping Lucas. |
| Menu disappeared | Reload the Sheet (close the tab, reopen). |
| Setup wizard keeps appearing | The API key in Config is empty — open the wizard and paste it back. |
| Row stuck in `sent_failed` | Email bounced or hit a Gmail limit. Check your Gmail Sent folder; if the email isn't there, try Send again. |

For anything weirder, ping Lucas with a screenshot and the row number.

Good luck — go book some meetings.
