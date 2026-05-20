// Tests for GmailScanner.gs

registerTest('GmailScanner: flips status to replied when inbound message lands after outbound', function () {
  var ss = FakeSpreadsheet();
  installSheetStructure(ss);
  var brands = ss.getSheetByName('Brands');
  var sent = new Date(Date.now() - 3600000);
  brands.appendRow(['Lulu','','Apparel','Calvin','calvin@lulu.com','VP','','sent','','',sent,sent,'','t_1',1,'']);
  var fakeGmail = FakeGmail();
  fakeGmail.threads['t_1'] = { messages: [{ from: 'sender@example.com', to: 'calvin@lulu.com', date: sent, body: 'out' }] };
  fakeGmail.simulateInboundReply('t_1', 'calvin@lulu.com');
  var result = scanForReplies(ss, { gmail: fakeGmail, senderEmail: 'sender@example.com' });
  var rowVals = brands.getDataRange().getValues()[1];
  assertEqual(rowVals[7], 'replied');
  assert(rowVals[12] instanceof Date, 'reply_at should be a Date');
  assertEqual(result.flipped, 1);
});

registerTest('GmailScanner: ignores thread when only outbound exists', function () {
  var ss = FakeSpreadsheet();
  installSheetStructure(ss);
  var brands = ss.getSheetByName('Brands');
  var sent = new Date(Date.now() - 3600000);
  brands.appendRow(['Lulu','','Apparel','Calvin','calvin@lulu.com','VP','','sent','','',sent,sent,'','t_1',1,'']);
  var fakeGmail = FakeGmail();
  fakeGmail.threads['t_1'] = { messages: [{ from: 'sender@example.com', to: 'calvin@lulu.com', date: sent, body: 'out' }] };
  scanForReplies(ss, { gmail: fakeGmail, senderEmail: 'sender@example.com' });
  var rowVals = brands.getDataRange().getValues()[1];
  assertEqual(rowVals[7], 'sent', 'status should not change');
});

registerTest('GmailScanner: skips rows in terminal states', function () {
  var ss = FakeSpreadsheet();
  installSheetStructure(ss);
  var brands = ss.getSheetByName('Brands');
  var sent = new Date(Date.now() - 3600000);
  brands.appendRow(['Lulu','','Apparel','Calvin','calvin@lulu.com','VP','','dead','','',sent,sent,'','t_1',2,'']);
  var fakeGmail = FakeGmail();
  fakeGmail.threads['t_1'] = { messages: [
    { from: 'sender@example.com', to: 'calvin@lulu.com', date: sent, body: 'out' },
    { from: 'calvin@lulu.com', to: 'sender@example.com', date: new Date(Date.now() + 1000), body: 'in' }
  ]};
  scanForReplies(ss, { gmail: fakeGmail, senderEmail: 'sender@example.com' });
  var rowVals = brands.getDataRange().getValues()[1];
  assertEqual(rowVals[7], 'dead', 'terminal status should not change');
});

registerTest('GmailScanner: skips rows without thread_id', function () {
  var ss = FakeSpreadsheet();
  installSheetStructure(ss);
  var brands = ss.getSheetByName('Brands');
  brands.appendRow(['Lulu','','Apparel','Calvin','calvin@lulu.com','VP','','queued','','','','','','',0,'']);
  var fakeGmail = FakeGmail();
  var result = scanForReplies(ss, { gmail: fakeGmail, senderEmail: 'sender@example.com' });
  assertEqual(result.flipped, 0);
});

registerTest('GmailScanner: throws when senderEmail is empty', function () {
  var ss = FakeSpreadsheet();
  installSheetStructure(ss);
  assertThrows(function () {
    scanForReplies(ss, { gmail: FakeGmail(), senderEmail: '' });
  });
});

registerTest('GmailScanner: skips inbound that arrived BEFORE last outbound (e.g., earlier in thread)', function () {
  var ss = FakeSpreadsheet();
  installSheetStructure(ss);
  var brands = ss.getSheetByName('Brands');
  var t1 = new Date(Date.now() - 7200000);
  var t2 = new Date(Date.now() - 3600000);
  brands.appendRow(['Lulu','','Apparel','Calvin','calvin@lulu.com','VP','','follow_up_1','','',t2,t2,'','t_1',2,'']);
  var fakeGmail = FakeGmail();
  fakeGmail.threads['t_1'] = { messages: [
    { from: 'sender@example.com', to: 'calvin@lulu.com', date: t1, body: 'initial' },
    { from: 'calvin@lulu.com', to: 'sender@example.com', date: new Date(t1.getTime() + 60000), body: 'reply we caught earlier' },
    { from: 'sender@example.com', to: 'calvin@lulu.com', date: t2, body: 'follow-up' }
    // no message after t2
  ]};
  scanForReplies(ss, { gmail: fakeGmail, senderEmail: 'sender@example.com' });
  var rowVals = brands.getDataRange().getValues()[1];
  assertEqual(rowVals[7], 'follow_up_1', 'status should not flip on stale inbound');
});
