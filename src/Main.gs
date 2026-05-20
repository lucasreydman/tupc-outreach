// Custom menu + sidebar entry points. onOpen() runs every time the Sheet opens.
// The menu shows minimal options before setup is complete; switches to the
// full menu once anthropic_api_key is set.

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  var config;
  try { config = getConfigMap(); } catch (e) { config = {}; }
  var menu = ui.createMenu('🎾 TUPC Outreach');
  if (!config.anthropic_api_key) {
    menu.addItem('Run setup wizard', 'showSetupWizard');
  } else {
    menu.addItem('Generate draft for selected row', 'menuGenerateDraft')
        .addItem('Send selected row', 'menuSendDraft')
        .addSeparator()
        .addItem('Scan for replies now', 'menuScanReplies')
        .addSeparator()
        .addItem('Re-install Sheet structure', 'menuInstallSheets')
        .addItem('Re-install time triggers', 'installTimeTriggers')
        .addItem('Open setup wizard', 'showSetupWizard');
  }
  menu.addToUi();
}

function menuGenerateDraft() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var row = SpreadsheetApp.getActiveRange().getRow();
  if (row < 2) { SpreadsheetApp.getUi().alert('Select a brand row first.'); return; }
  try {
    generateDraftForRow(ss, row);
    showDraftSidebar(row);
  } catch (e) {
    SpreadsheetApp.getUi().alert('Draft failed: ' + e.message);
  }
}

function menuSendDraft() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var row = SpreadsheetApp.getActiveRange().getRow();
  if (row < 2) { SpreadsheetApp.getUi().alert('Select a brand row first.'); return; }
  var ui = SpreadsheetApp.getUi();
  var resp = ui.alert('Send email for row ' + row + '?', ui.ButtonSet.YES_NO);
  if (resp !== ui.Button.YES) return;
  try {
    sendDraftForRow(ss, row);
    ui.alert('Sent.');
  } catch (e) {
    ui.alert('Send failed: ' + e.message);
  }
}

function menuScanReplies() {
  try {
    var result = scanForReplies();
    SpreadsheetApp.getUi().alert('Reply scan complete. Flipped: ' + (result && result.flipped !== undefined ? result.flipped : 0));
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error: ' + e.message);
  }
}

function menuInstallSheets() {
  installSheetStructure();
  SpreadsheetApp.getUi().alert('Sheet structure installed.');
}

function showDraftSidebar(rowIndex) {
  var tmpl = HtmlService.createTemplateFromFile('Sidebar');
  tmpl.rowIndex = rowIndex;
  var html = tmpl.evaluate().setTitle('Draft preview').setWidth(420);
  SpreadsheetApp.getUi().showSidebar(html);
}

// Called from Sidebar.html via google.script.run.
function getDraftForRow(rowIndex) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var row = readBrandRow(ss.getSheetByName('Brands'), rowIndex);
  return {
    subject: row.draft_subject || '',
    body: row.draft_body || '',
    contact_email: row.contact_email || '',
    company: row.company || ''
  };
}

function saveDraftEdits(rowIndex, subject, body) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var brands = ss.getSheetByName('Brands');
  writeBrandCell(brands, rowIndex, 'draft_subject', subject);
  writeBrandCell(brands, rowIndex, 'draft_body', body);
}

function sendDraftFromSidebar(rowIndex) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  sendDraftForRow(ss, rowIndex);
  return 'Sent';
}
