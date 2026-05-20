// Tests for Outreach.processFollowUps + sendFollowUpForRow.

function setupSheetWithConfig(ss) {
  installSheetStructure(ss);
  setConfigValue(ss, 'sender_name', 'Zach');
  setConfigValue(ss, 'sender_signature', 'Zach\nTUPC');
  setConfigValue(ss, 'business_address', 'TO');
  setConfigValue(ss, 'unsubscribe_mailto', 'mailto:x@y.com');
  setConfigValue(ss, 'deck_drive_file_id', 'f');
  setConfigValue(ss, 'anthropic_api_key', 'sk');
  setConfigValue(ss, 'daily_send_cap', '30');
}

function yesterday() { return new Date(Date.now() - 24 * 60 * 60 * 1000); }

registerTest('Outreach: processFollowUps advances sent -> follow_up_1', function () {
  var ss = FakeSpreadsheet();
  setupSheetWithConfig(ss);
  var brands = ss.getSheetByName('Brands');
  var y = yesterday();
  brands.appendRow(['Lulu','','Apparel','Calvin','calvin@lulu.com','VP','','sent','','',y,y,'','t_1',1,'']);
  var fakeGmail = FakeGmail();
  fakeGmail.threads['t_1'] = { messages: [{ from: 'sender@example.com', to: 'calvin@lulu.com', date: y, body: 'old' }] };
  var fakeClaude = FakeClaude({ nextResponse: { subject: 'Bump', body: 'Bumping — Zach' }});
  var fakeDrive = FakeDrive();
  var result = processFollowUps(ss, { claude: fakeClaude.call, gmail: fakeGmail, drive: fakeDrive });
  var rowVals = brands.getDataRange().getValues()[1];
  assertEqual(rowVals[7], 'follow_up_1');
  assertEqual(rowVals[14], 2, 'sent_count should increment to 2');
  assertEqual(result.processed, 1);
});

registerTest('Outreach: processFollowUps advances follow_up_1 -> follow_up_2', function () {
  var ss = FakeSpreadsheet();
  setupSheetWithConfig(ss);
  var brands = ss.getSheetByName('Brands');
  var y = yesterday();
  brands.appendRow(['Lulu','','Apparel','Calvin','calvin@lulu.com','VP','','follow_up_1','','',y,y,'','t_1',2,'']);
  var fakeGmail = FakeGmail();
  fakeGmail.threads['t_1'] = { messages: [{ from: 'sender@example.com', to: 'calvin@lulu.com', date: y, body: 'old' }] };
  var fakeClaude = FakeClaude({ nextResponse: { subject: 'Value add', body: 'Value — Zach' }});
  var fakeDrive = FakeDrive();
  processFollowUps(ss, { claude: fakeClaude.call, gmail: fakeGmail, drive: fakeDrive });
  var rowVals = brands.getDataRange().getValues()[1];
  assertEqual(rowVals[7], 'follow_up_2');
});

registerTest('Outreach: processFollowUps follow_up_2 -> breakup sets status dead', function () {
  var ss = FakeSpreadsheet();
  setupSheetWithConfig(ss);
  var brands = ss.getSheetByName('Brands');
  var y = yesterday();
  brands.appendRow(['Lulu','','Apparel','Calvin','calvin@lulu.com','VP','','follow_up_2','','',y,y,'','t_1',3,'']);
  var fakeGmail = FakeGmail();
  fakeGmail.threads['t_1'] = { messages: [{ from: 'sender@example.com', to: 'calvin@lulu.com', date: y, body: 'old' }] };
  var fakeClaude = FakeClaude({ nextResponse: { subject: 'Last', body: 'Last — Zach' }});
  var fakeDrive = FakeDrive();
  processFollowUps(ss, { claude: fakeClaude.call, gmail: fakeGmail, drive: fakeDrive });
  var rowVals = brands.getDataRange().getValues()[1];
  assertEqual(rowVals[7], 'dead', 'should be dead after breakup send');
  assertEqual(rowVals[14], 4, 'sent_count should be 4 after breakup');
});

registerTest('Outreach: processFollowUps skips rows with sent_count >= 4', function () {
  var ss = FakeSpreadsheet();
  setupSheetWithConfig(ss);
  var brands = ss.getSheetByName('Brands');
  var y = yesterday();
  brands.appendRow(['Lulu','','Apparel','Calvin','calvin@lulu.com','VP','','follow_up_2','','',y,y,'','t_1',4,'']);
  var fakeGmail = FakeGmail();
  var fakeClaude = FakeClaude();
  var result = processFollowUps(ss, { claude: fakeClaude.call, gmail: fakeGmail, drive: FakeDrive() });
  assertEqual(result.processed, 0);
  assertEqual(fakeClaude.calls.length, 0);
});

registerTest('Outreach: processFollowUps skips rows whose next_action is in the future', function () {
  var ss = FakeSpreadsheet();
  setupSheetWithConfig(ss);
  var brands = ss.getSheetByName('Brands');
  var tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  brands.appendRow(['Lulu','','Apparel','Calvin','calvin@lulu.com','VP','','sent','','',new Date(),tomorrow,'','t_1',1,'']);
  var fakeClaude = FakeClaude();
  var result = processFollowUps(ss, { claude: fakeClaude.call, gmail: FakeGmail(), drive: FakeDrive() });
  assertEqual(result.processed, 0);
  assertEqual(fakeClaude.calls.length, 0);
});

registerTest('Outreach: processFollowUps short-circuits when daily cap is hit', function () {
  var ss = FakeSpreadsheet();
  setupSheetWithConfig(ss);
  setConfigValue(ss, 'daily_send_cap', '1');
  var brands = ss.getSheetByName('Brands');
  var today = new Date();
  var y = yesterday();
  // One row already sent today (counts against cap)
  brands.appendRow(['A','','Apparel','A','a@a.com','VP','','sent','','',today,today,'','t_a',1,'']);
  // Another row due for follow-up
  brands.appendRow(['B','','Apparel','B','b@b.com','VP','','sent','','',y,y,'','t_b',1,'']);
  var fakeClaude = FakeClaude();
  var fakeGmail = FakeGmail();
  fakeGmail.threads['t_b'] = { messages: [{ from: 'sender@example.com', to: 'b@b.com', date: y, body: 'o' }] };
  var result = processFollowUps(ss, { claude: fakeClaude.call, gmail: fakeGmail, drive: FakeDrive() });
  assertEqual(result.skipped_due_to_cap, true);
  assertEqual(fakeClaude.calls.length, 0, 'Claude should not be called when cap hit');
});

registerTest('Outreach: processFollowUps processes oldest next_action first', function () {
  var ss = FakeSpreadsheet();
  setupSheetWithConfig(ss);
  var brands = ss.getSheetByName('Brands');
  var older = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  var newer = yesterday();
  brands.appendRow(['Newer','','Apparel','N','n@n.com','VP','','sent','','',newer,newer,'','t_n',1,'']);
  brands.appendRow(['Older','','Apparel','O','o@o.com','VP','','sent','','',older,older,'','t_o',1,'']);
  var calls = [];
  var fakeClaude = FakeClaude({ nextResponse: { subject: 's', body: 'b — Zach' }});
  var origCall = fakeClaude.call;
  fakeClaude.call = function (sys, user, model, key) {
    var m = user.match(/Brand: (\w+)/);
    if (m) calls.push(m[1]);
    return origCall(sys, user, model, key);
  };
  var fakeGmail = FakeGmail();
  fakeGmail.threads['t_n'] = { messages: [{ from: 'sender@example.com', to: 'n@n.com', date: newer, body: 'o' }] };
  fakeGmail.threads['t_o'] = { messages: [{ from: 'sender@example.com', to: 'o@o.com', date: older, body: 'o' }] };
  processFollowUps(ss, { claude: fakeClaude.call, gmail: fakeGmail, drive: FakeDrive() });
  assertEqual(calls[0], 'Older', 'older row should be processed first');
});
