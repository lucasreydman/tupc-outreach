// First-run setup wizard. Opens the SetupSidebar HTML, lets the user paste
// config values, install time triggers, and send a test email to themselves.

function showSetupWizard() {
  installSheetStructure();
  var html = HtmlService.createHtmlOutputFromFile('SetupSidebar')
    .setTitle('TUPC Outreach setup')
    .setWidth(420);
  SpreadsheetApp.getUi().showSidebar(html);
}

function setupGetConfig() {
  return getConfigMap();
}

function setupSaveConfig(updates) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(updates).forEach(function (k) {
    setConfigValue(ss, k, updates[k]);
  });
  return 'Saved.';
}

function setupInstallTriggers() {
  installTimeTriggers();
  return 'Triggers installed (reply scan runs hourly).';
}

function setupSendTestEmail() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var config = getConfigMap(ss);
  if (!config.sender_name) throw new Error('Set sender_name first.');
  if (!config.unsubscribe_mailto) throw new Error('Set unsubscribe_mailto first.');
  if (!config.business_address) throw new Error('Set business_address first.');
  var me = Session.getActiveUser().getEmail();
  if (!me) throw new Error('Could not detect active user email — try re-authorizing.');
  var body = composeFullBody(
    'This is a test email from your TUPC outreach tool. If you can read this, sending works end-to-end.',
    config
  );
  GmailApp.sendEmail(me, '[TUPC test] Outreach tool wired up', body, {
    name: config.sender_name
  });
  return 'Test email sent to ' + me;
}
