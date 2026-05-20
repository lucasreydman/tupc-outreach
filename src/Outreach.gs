// Outreach core: draft generation, send, follow-up processing.
// Production code accepts ss / claude / gmail / drive via opts for test injection.

// BRAND_CONTEXT is the system prompt Claude sees on every call.
// Source of truth: templates/tupc-brand-context.md (keep in sync).
var BRAND_CONTEXT = [
  'You are writing cold sponsorship outreach emails on behalf of Toronto United Pickleball Club (TUPC). Each email must be short, specific to the recipient brand, and feel like it was written by a thoughtful human who actually knows the brand — not by a template.',
  '',
  'WHAT TUPC IS',
  "Toronto United Pickleball Club is Canada's leading professional pickleball franchise. We compete in the CNPL (Canadian National Pickleball League), Canada's first and only pro pickleball league. Founded by operators who have built 8- and 9-figure businesses across music, events, hospitality, and tech. We play out of Toronto — Canada's largest market and North America's 4th-largest city.",
  '',
  'BY THE NUMBERS',
  '- 2023 CNPL Champions, 2025 CNPL Finalists',
  '- 10M+ impressions in Season 3',
  '- 1M+ combined social followers across owners and team',
  '- #1 most-followed pro pickleball team in Canada',
  '- Finals aired on CBC Sports; most-viewed pro pickleball event in Canada',
  '- $300,000 in league player payouts',
  '',
  'WHY PICKLEBALL IS THE RIGHT PLACE',
  '- +291% increase in Canadian sport participation since 2021',
  '- 1.54M Canadian players (+57% since 2022)',
  '- +550% Google search interest over the past 5 years',
  '- 75% of players play for pure enjoyment, 66% for health',
  '- Strong overlap with affluent active-lifestyle consumers; 59/41 male/female split',
  '',
  'PAST PARTNER CASE STUDIES (use as proof points when relevant)',
  '- Club Med (Digital): presenting sponsor of "Beyond The Kitchen" docuseries — 80,000+ views across 10 episodes, 1,000+ hours watch time, qualified travel leads.',
  '- Cadillac Fairview (Live): "Pickleball in the Mall" at Sherway Gardens — 240+ players on court, 5,000+ in-person impressions, 100,000+ digital impressions.',
  '- TSS Pickleball (Team partner): main jersey logo + every event + co-mentions on socials — 1M+ organic impressions and qualified home-court leads.',
  '- Roots (Apparel): official warm-up/sideline kit — 100,000+ digital impressions tied to their athleisure line.',
  '- Other current partners: Sleeman, Cadillac Fairview, TSS.',
  '',
  'PARTNERSHIP TIERS',
  'Partnerships start at $3,500. Tiers scale up based on visibility (jersey placement, live event presence, social inclusion, content series sponsorship). The sponsorship deck (attached to every email) contains the full menu.',
  '',
  'ACTIVATION IDEAS BY CATEGORY',
  '- Automotive: "Drive to the Championship" series; vehicle integration at events; title sponsor of player transportation.',
  '- Retail: in-mall or in-store activation modeled on the Sherway Gardens event; branded pop-up court.',
  '- Health & Wellness: title sponsor of recovery/training content; athlete-led health content; sideline product placement (hydration, supplements, wearables).',
  '- Apparel: Roots-style warm-up/sideline kit + co-branded merch; behind-the-scenes content during fittings.',
  '- Travel: Club Med-style content series sponsorship; "team trip" content; pickleball-travel audience overlap is high.',
  '- Financial services: "Build Like a Champion" personal-finance content anchored on player stories; sleeve patch.',
  '- Beverage: official hydration / official beverage; sideline placement; post-match content; event activations.',
  '- Tech: branded stats overlays; official tech of the team; training-tech content series.',
  '- Fitness equipment: official training equipment; BTS training content; courtside displays.',
  '- CPG: sampling at live events; courtside branding; co-branded social.',
  '- Real estate: "Home Court" series featuring at-home court installs; open-house activations.',
  '',
  'WRITING RULES — NON-NEGOTIABLE',
  '1. <=120 words body. Subject <=60 chars.',
  '2. SUBJECT LINE — must be a hook tied to the recipient\'s VERTICAL (category). The subject is what gets the open; do not waste it on "Partnership opportunity" or "[Company] x TUPC". Reference the category-specific value. Examples (adapt — do not reuse verbatim):',
  '   - Automotive: "Drive to the championship x {Brand}" / "Vehicle integration for Canadian pro pickleball"',
  '   - Retail: "Court activation for {Brand} flagship" / "240+ shoppers at our last mall pop-up"',
  '   - Health & Wellness: "1.54M Canadian active adults — {Brand} fit" / "Athlete-led wellness content"',
  '   - Apparel: "Sideline kit for Canada\'s #1 pickleball team" / "Roots ran this play — {Brand} version"',
  '   - Travel: "Pickleball travel is a growth category" / "Club Med got 80K views — {Brand}\'s turn"',
  '   - Financial Services: "Build Like a Champion — athlete finance content" / "Sleeve patch sponsorship"',
  '   - Beverage: "Official hydration of Canadian pro pickleball" / "Sideline placement + post-match content"',
  '   - Tech: "Stats overlays — Canadian Pro Pickleball" / "Training-tech content series"',
  '   - Fitness Equipment: "Official training equipment of Canada\'s #1 team" / "BTS training content x {Brand}"',
  '   - CPG: "5K+ in-person impressions per activation" / "Sampling at Canadian pro pickleball events"',
  '   - Real Estate: "Home Court x {Brand} content series" / "At-home court installs — open-house play"',
  '   Use lowercase or sentence case (feels human, not marketing). Avoid title case. No exclamation marks. No "RE:" / "FW:" tricks. No spammy hooks ("FREE", "guaranteed", "amazing opportunity"). Aim 5–9 words.',
  '3. Brand-specific opener. Reference something concrete about the recipient brand — a recent campaign, product launch, audience overlap, or category positioning. Never "I hope this finds you well." Never a generic compliment.',
  '4. One concrete activation idea — pick the most relevant from above, or invent one if their category is unlisted. Specific, not "we could explore a partnership."',
  '5. One soft CTA: a 15-minute call. Low-friction ask.',
  '6. Plain language. No "leverage," "synergies," or "Pickleball is exploding."',
  '7. Include the sender_name passed in the user message, typically as the signoff.',
  '8. Never invent specifics about the recipient brand. If you don\'t know a concrete fact, work from category + role.',
  '',
  'OUTPUT FORMAT — NON-NEGOTIABLE',
  'Return STRICT JSON only. No prose before or after. No code fences. Schema:',
  '{"subject": "string, <60 chars", "body": "string, plain text, must include sender_name"}',
  'If you cannot generate a compliant email (missing required info), return {"subject":"","body":""} and the application will surface an error. Do not improvise around missing data.'
].join('\n');

var STATUS = {
  QUEUED: 'queued',
  DRAFTED: 'drafted',
  SENT: 'sent',
  REPLIED: 'replied',
  MEETING_BOOKED: 'meeting_booked',
  WON: 'won',
  DEAD: 'dead',
  DRAFT_FAILED: 'draft_failed',
  SEND_FAILED: 'send_failed',
  INVALID_EMAIL: 'invalid_email'
};

function isValidEmail(e) {
  return typeof e === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
}

function normalizeHeader(h) {
  return String(h).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function readBrandRow(sheet, rowIndex) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
  var out = {};
  for (var i = 0; i < headers.length; i++) {
    out[normalizeHeader(headers[i])] = row[i];
  }
  return out;
}

function writeBrandCell(sheet, rowIndex, key, value) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  for (var i = 0; i < headers.length; i++) {
    if (normalizeHeader(headers[i]) === key) {
      sheet.getRange(rowIndex, i + 1).setValue(value);
      return;
    }
  }
  throw new Error('Unknown column: ' + key);
}

function buildUserPrompt(row, config) {
  var lines = [
    'Brand: ' + (row.company || 'unknown') + ' (' + (row.category || 'Other') + ')',
    'Website: ' + (row.website || 'n/a'),
    'Recipient: ' + (row.contact_name || 'team') + ', ' + (row.contact_role || ''),
    row.pitch_angle ? 'Pitch angle: ' + row.pitch_angle : 'Pitch angle: (infer one — tie to ' + (row.category || 'their category') + ' x pickleball)',
    'Sender: ' + (config.sender_name || '[sender]') + ', ' + (config.sender_title || ''),
    '',
    'Return STRICT JSON: {"subject":"<=60 chars, vertical-tied hook","body":"plain text email body, <=120 words, must include sender name"}'
  ];
  return lines.join('\n');
}

function composeFullBody(claudeBody, config) {
  var parts = [
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

function generateDraftForRow(ss, rowIndex, opts) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  opts = opts || {};
  var brands = ss.getSheetByName('Brands');
  var config = opts.configOverride || getConfigMap(ss);
  var row = readBrandRow(brands, rowIndex);

  if (!isValidEmail(row.contact_email)) {
    writeBrandCell(brands, rowIndex, 'status', STATUS.INVALID_EMAIL);
    throw new Error('Invalid contact_email: ' + row.contact_email);
  }

  var userMessage = buildUserPrompt(row, config);
  var claudeCall = opts.claude || function (sys, user, model, key) { return callClaude(sys, user, model, key); };

  try {
    var result = claudeCall(BRAND_CONTEXT, userMessage, config.anthropic_model || 'claude-sonnet-4-6', config.anthropic_api_key);
    writeBrandCell(brands, rowIndex, 'draft_subject', result.subject);
    writeBrandCell(brands, rowIndex, 'draft_body', result.body);
    writeBrandCell(brands, rowIndex, 'status', STATUS.DRAFTED);
    return result;
  } catch (e) {
    writeBrandCell(brands, rowIndex, 'status', STATUS.DRAFT_FAILED);
    writeBrandCell(brands, rowIndex, 'notes', (row.notes || '') + '\n[draft failed: ' + e.message + ']');
    throw e;
  }
}

function sendDraftForRow(ss, rowIndex, opts) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  opts = opts || {};
  var brands = ss.getSheetByName('Brands');
  var config = opts.configOverride || getConfigMap(ss);
  var row = readBrandRow(brands, rowIndex);

  if (!isValidEmail(row.contact_email)) {
    writeBrandCell(brands, rowIndex, 'status', STATUS.INVALID_EMAIL);
    throw new Error('Invalid contact_email: ' + row.contact_email);
  }

  var subject = row.draft_subject;
  var body = row.draft_body;
  if (!subject || !body) throw new Error('No draft to send for row ' + rowIndex);

  var fullBody = composeFullBody(body, config);
  var gmail = opts.gmail || (typeof GmailApp !== 'undefined' ? GmailApp : null);
  var drive = opts.drive || (typeof DriveApp !== 'undefined' ? DriveApp : null);
  if (!gmail) throw new Error('GmailApp unavailable');

  var attachments = [];
  if (config.deck_drive_file_id && drive) {
    try {
      attachments.push(drive.getFileById(config.deck_drive_file_id).getBlob());
    } catch (e) {
      writeBrandCell(brands, rowIndex, 'notes', (row.notes || '') + '\n[deck attach failed: ' + e.message + ']');
    }
  }
  var cc = config.cc_emails || '';

  var threadId = '';
  try {
    var sendResult = gmail.sendEmail(row.contact_email, subject, fullBody, {
      attachments: attachments,
      cc: cc,
      name: config.sender_name || ''
    });
    threadId = (sendResult && sendResult.threadId) ? sendResult.threadId : findRecentSentThreadId(gmail, row.contact_email, subject);
  } catch (e) {
    writeBrandCell(brands, rowIndex, 'status', STATUS.SEND_FAILED);
    writeBrandCell(brands, rowIndex, 'notes', (row.notes || '') + '\n[send failed: ' + e.message + ']');
    throw e;
  }

  var today = new Date();
  writeBrandCell(brands, rowIndex, 'status', STATUS.SENT);
  writeBrandCell(brands, rowIndex, 'last_action_date', today);
  writeBrandCell(brands, rowIndex, 'thread_id', threadId);
  writeBrandCell(brands, rowIndex, 'sent_count', (Number(row.sent_count) || 0) + 1);
  writeBrandCell(brands, rowIndex, 'draft_subject', '');
  writeBrandCell(brands, rowIndex, 'draft_body', '');
}

function findRecentSentThreadId(gmail, recipient, subject) {
  // Used only in production. In tests, the fake's sendEmail returns {threadId} directly.
  if (typeof GmailApp === 'undefined') return 'MISSING';
  if (typeof Utilities !== 'undefined' && Utilities.sleep) Utilities.sleep(2000);
  var query = 'in:sent to:' + recipient + ' newer_than:1d';
  var threads = GmailApp.search(query, 0, 5);
  for (var i = 0; i < threads.length; i++) {
    if (threads[i].getFirstMessageSubject() === subject) return threads[i].getId();
  }
  return threads[0] ? threads[0].getId() : 'MISSING';
}
