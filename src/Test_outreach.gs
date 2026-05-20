// Tests for Outreach.gs — generateDraftForRow + sendDraftForRow.
// processFollowUps tests live in Test_outreach_followup.gs.

function setupBrandsRowForTest(ss, overrides) {
  installSheetStructure(ss);
  setConfigValue(ss, 'sender_name', 'Zach');
  setConfigValue(ss, 'sender_title', 'Outreach, TUPC');
  setConfigValue(ss, 'sender_signature', 'Zach\nTUPC');
  setConfigValue(ss, 'business_address', '123 Maple Ave, Toronto');
  setConfigValue(ss, 'unsubscribe_mailto', 'mailto:opt@out.com');
  setConfigValue(ss, 'deck_drive_file_id', 'fake_file_id');
  setConfigValue(ss, 'anthropic_api_key', 'sk');
  setConfigValue(ss, 'daily_send_cap', '30');
  var defaults = ['Lulu','lulu.com','Apparel','Calvin','calvin@lulu.com','VP Marketing','','queued','','','','','','',0,''];
  var row = defaults.slice();
  Object.keys(overrides || {}).forEach(function (k) {
    var idx = { company:0,website:1,category:2,contact_name:3,contact_email:4,contact_role:5,pitch_angle:6,status:7,draft_subject:8,draft_body:9,last_action_date:10,next_action_date:11,reply_at:12,thread_id:13,sent_count:14,notes:15 }[k];
    if (idx !== undefined) row[idx] = overrides[k];
  });
  ss.getSheetByName('Brands').appendRow(row);
}

registerTest('Outreach: generateDraft writes subject/body and sets status drafted', function () {
  var ss = FakeSpreadsheet();
  setupBrandsRowForTest(ss, {});
  var fakeClaude = FakeClaude({ nextResponse: { subject: 'Pickleball x Lulu', body: 'Hi Calvin — Zach' }});
  generateDraftForRow(ss, 2, { claude: fakeClaude.call });
  var brands = ss.getSheetByName('Brands');
  var rowVals = brands.getDataRange().getValues()[1];
  assertEqual(rowVals[7], 'drafted');
  assertEqual(rowVals[8], 'Pickleball x Lulu');
  assertContains(rowVals[9], 'Zach');
});

registerTest('Outreach: generateDraft passes BRAND_CONTEXT as system prompt', function () {
  var ss = FakeSpreadsheet();
  setupBrandsRowForTest(ss, {});
  var fakeClaude = FakeClaude({ nextResponse: { subject: 'S', body: 'B — Zach' }});
  generateDraftForRow(ss, 2, { claude: fakeClaude.call });
  assertEqual(fakeClaude.calls.length, 1);
  assertContains(fakeClaude.calls[0].systemPrompt, 'Toronto United Pickleball Club');
  assertContains(fakeClaude.calls[0].userMessage, 'Lulu');
  assertContains(fakeClaude.calls[0].userMessage, 'Apparel');
});

registerTest('Outreach: generateDraft marks draft_failed on Claude error', function () {
  var ss = FakeSpreadsheet();
  setupBrandsRowForTest(ss, {});
  var fakeClaude = FakeClaude({ shouldThrow: true });
  try { generateDraftForRow(ss, 2, { claude: fakeClaude.call }); } catch (e) {}
  var rowVals = ss.getSheetByName('Brands').getDataRange().getValues()[1];
  assertEqual(rowVals[7], 'draft_failed');
});

registerTest('Outreach: generateDraft marks invalid_email and skips Claude', function () {
  var ss = FakeSpreadsheet();
  setupBrandsRowForTest(ss, { contact_email: 'not-an-email' });
  var fakeClaude = FakeClaude();
  try { generateDraftForRow(ss, 2, { claude: fakeClaude.call }); } catch (e) {}
  assertEqual(fakeClaude.calls.length, 0);
  var rowVals = ss.getSheetByName('Brands').getDataRange().getValues()[1];
  assertEqual(rowVals[7], 'invalid_email');
});

registerTest('Outreach: sendDraft appends CASL footer to body', function () {
  var ss = FakeSpreadsheet();
  setupBrandsRowForTest(ss, { status: 'drafted', draft_subject: 'Subj', draft_body: 'Body — Zach' });
  var fakeGmail = FakeGmail();
  var fakeDrive = FakeDrive();
  sendDraftForRow(ss, 2, { gmail: fakeGmail, drive: fakeDrive });
  assertEqual(fakeGmail.sent.length, 1);
  assertContains(fakeGmail.sent[0].plainBody, '123 Maple Ave, Toronto');
  assertContains(fakeGmail.sent[0].plainBody, 'mailto:opt@out.com');
  assertContains(fakeGmail.sent[0].plainBody, 'Zach\nTUPC');
});

registerTest('Outreach: sendDraft advances status to sent and increments counter', function () {
  var ss = FakeSpreadsheet();
  setupBrandsRowForTest(ss, { status: 'drafted', draft_subject: 'Subj', draft_body: 'Body — Zach' });
  var fakeGmail = FakeGmail();
  var fakeDrive = FakeDrive();
  sendDraftForRow(ss, 2, { gmail: fakeGmail, drive: fakeDrive });
  var rowVals = ss.getSheetByName('Brands').getDataRange().getValues()[1];
  assertEqual(rowVals[7], 'sent');
  assertEqual(rowVals[14], 1, 'sent_count should be 1');
  assert(rowVals[10] instanceof Date, 'last_action_date not a Date');
  assert(rowVals[11] instanceof Date, 'next_action_date not a Date');
  assert(String(rowVals[13]).length > 0, 'thread_id not captured');
});

registerTest('Outreach: sendDraft attaches deck file', function () {
  var ss = FakeSpreadsheet();
  setupBrandsRowForTest(ss, { status: 'drafted', draft_subject: 'Subj', draft_body: 'Body — Zach' });
  var fakeGmail = FakeGmail();
  var fakeDrive = FakeDrive('PDF_BYTES');
  sendDraftForRow(ss, 2, { gmail: fakeGmail, drive: fakeDrive });
  assertEqual(fakeGmail.sent[0].opts.attachments.length, 1);
  assertEqual(fakeGmail.sent[0].opts.attachments[0], 'PDF_BYTES');
});

registerTest('Outreach: sendDraft sets CC from config', function () {
  var ss = FakeSpreadsheet();
  setupBrandsRowForTest(ss, { status: 'drafted', draft_subject: 'Subj', draft_body: 'Body — Zach' });
  var fakeGmail = FakeGmail();
  var fakeDrive = FakeDrive();
  sendDraftForRow(ss, 2, { gmail: fakeGmail, drive: fakeDrive });
  assertEqual(fakeGmail.sent[0].opts.cc, 'rliorti@gmail.com');
});

registerTest('Outreach: sendDraft refuses to send without a draft', function () {
  var ss = FakeSpreadsheet();
  setupBrandsRowForTest(ss, { status: 'queued', draft_subject: '', draft_body: '' });
  var fakeGmail = FakeGmail();
  var fakeDrive = FakeDrive();
  assertThrows(function () { sendDraftForRow(ss, 2, { gmail: fakeGmail, drive: fakeDrive }); });
  assertEqual(fakeGmail.sent.length, 0);
});

registerTest('Outreach: sendDraft clears draft cells after send', function () {
  var ss = FakeSpreadsheet();
  setupBrandsRowForTest(ss, { status: 'drafted', draft_subject: 'Subj', draft_body: 'Body — Zach' });
  var fakeGmail = FakeGmail();
  var fakeDrive = FakeDrive();
  sendDraftForRow(ss, 2, { gmail: fakeGmail, drive: fakeDrive });
  var rowVals = ss.getSheetByName('Brands').getDataRange().getValues()[1];
  assertEqual(rowVals[8], '', 'draft_subject should be cleared');
  assertEqual(rowVals[9], '', 'draft_body should be cleared');
});
