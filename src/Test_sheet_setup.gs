// Tests for SheetSetup.gs

registerTest('SheetSetup: creates Brands tab', function () {
  var ss = FakeSpreadsheet();
  installSheetStructure(ss);
  assert(ss.getSheetByName('Brands') !== null, 'Brands tab missing');
});

registerTest('SheetSetup: creates all expected tabs', function () {
  var ss = FakeSpreadsheet();
  installSheetStructure(ss);
  ['Brands','Templates','Config','Dashboard','Test Results'].forEach(function (n) {
    assert(ss.getSheetByName(n) !== null, n + ' tab missing');
  });
});

registerTest('SheetSetup: idempotent — second install does not duplicate Config rows', function () {
  var ss = FakeSpreadsheet();
  installSheetStructure(ss);
  var beforeConfigRows = ss.getSheetByName('Config').getLastRow();
  installSheetStructure(ss);
  var afterConfigRows = ss.getSheetByName('Config').getLastRow();
  assertEqual(afterConfigRows, beforeConfigRows, 'Config rows duplicated on re-install');
});

registerTest('SheetSetup: idempotent — second install does not duplicate Templates rows', function () {
  var ss = FakeSpreadsheet();
  installSheetStructure(ss);
  var before = ss.getSheetByName('Templates').getLastRow();
  installSheetStructure(ss);
  var after = ss.getSheetByName('Templates').getLastRow();
  assertEqual(after, before, 'Templates rows duplicated');
});

registerTest('SheetSetup: Templates has 4 default stage rows', function () {
  var ss = FakeSpreadsheet();
  installSheetStructure(ss);
  var lastRow = ss.getSheetByName('Templates').getLastRow();
  assertEqual(lastRow, 5, 'Expected 1 header + 4 default rows');
});

registerTest('SheetSetup: Config has expected required keys', function () {
  var ss = FakeSpreadsheet();
  installSheetStructure(ss);
  var config = ss.getSheetByName('Config').getDataRange().getValues();
  var keys = config.slice(1).map(function (r) { return r[0]; });
  ['anthropic_api_key','deck_drive_file_id','unsubscribe_mailto','business_address','sender_name','daily_send_cap'].forEach(function (k) {
    assert(keys.indexOf(k) !== -1, k + ' missing from Config');
  });
});

registerTest('SheetSetup: getConfigMap returns key/value pairs', function () {
  var ss = FakeSpreadsheet();
  installSheetStructure(ss);
  setConfigValue(ss, 'sender_name', 'Test Person');
  var cfg = getConfigMap(ss);
  assertEqual(cfg.sender_name, 'Test Person');
  assertEqual(cfg.anthropic_model, 'claude-sonnet-4-6');
});

registerTest('SheetSetup: setConfigValue updates existing key', function () {
  var ss = FakeSpreadsheet();
  installSheetStructure(ss);
  setConfigValue(ss, 'daily_send_cap', '50');
  var cfg = getConfigMap(ss);
  assertEqual(cfg.daily_send_cap, '50');
});

registerTest('SheetSetup: setConfigValue inserts new key', function () {
  var ss = FakeSpreadsheet();
  installSheetStructure(ss);
  setConfigValue(ss, 'custom_key', 'custom_value');
  var cfg = getConfigMap(ss);
  assertEqual(cfg.custom_key, 'custom_value');
});
