// Time-based trigger management. Idempotent — running installTimeTriggers
// twice does not duplicate triggers.

var TRIGGER_HANDLERS = ['triggerScanForReplies'];

function installTimeTriggers() {
  uninstallTimeTriggers();
  ScriptApp.newTrigger('triggerScanForReplies')
    .timeBased().everyHours(1).create();
}

function uninstallTimeTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (TRIGGER_HANDLERS.indexOf(triggers[i].getHandlerFunction()) !== -1) {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
}

function triggerScanForReplies() {
  scanForReplies();
}
