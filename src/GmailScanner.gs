// Reply detection. Walks tracked threads, compares actual Gmail message
// timestamps (not Sheet date columns), flips status to 'replied' when an
// inbound message lands after the most recent outbound.

var TERMINAL_STATUSES = ['replied','meeting_booked','won','dead','invalid_email','send_failed','draft_failed'];
var REPLIED_LABEL = 'TUPC/Replied';

function scanForReplies(ss, opts) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  opts = opts || {};
  var brands = ss.getSheetByName('Brands');
  var gmail = opts.gmail || (typeof GmailApp !== 'undefined' ? GmailApp : null);
  if (!gmail) throw new Error('GmailApp unavailable');
  var senderEmail = opts.senderEmail || (typeof Session !== 'undefined' && Session.getActiveUser ? Session.getActiveUser().getEmail() : '');
  if (!senderEmail) throw new Error('scanForReplies needs a sender email; pass opts.senderEmail or run in a context with Session access.');
  var senderLower = String(senderEmail).toLowerCase();

  var values = brands.getDataRange().getValues();
  var headers = values[0];
  var headerIdx = {};
  for (var h = 0; h < headers.length; h++) headerIdx[normalizeHeader(headers[h])] = h;
  function col(key) {
    if (headerIdx[key] === undefined) throw new Error('Missing column ' + key);
    return headerIdx[key];
  }

  var flipped = 0;
  for (var i = 1; i < values.length; i++) {
    var threadId = values[i][col('thread_id')];
    var status = values[i][col('status')];
    if (!threadId || TERMINAL_STATUSES.indexOf(status) !== -1) continue;
    try {
      var thread = gmail.getThreadById(threadId);
      if (!thread) continue;
      var messages = thread.getMessages();
      var lastOutbound = null;
      var lastInbound = null;
      for (var m = 0; m < messages.length; m++) {
        var from = String(messages[m].getFrom() || '').toLowerCase();
        var date = messages[m].getDate();
        if (from.indexOf(senderLower) !== -1) {
          if (!lastOutbound || date > lastOutbound) lastOutbound = date;
        } else {
          if (!lastInbound || date > lastInbound) lastInbound = date;
        }
      }
      var firstInboundAfter = (lastInbound && (!lastOutbound || lastInbound > lastOutbound)) ? lastInbound : null;
      if (firstInboundAfter) {
        brands.getRange(i + 1, col('status') + 1).setValue('replied');
        brands.getRange(i + 1, col('reply_at') + 1).setValue(firstInboundAfter);
        flipped++;
        if (typeof GmailApp !== 'undefined' && thread.addLabel) {
          try {
            var label = GmailApp.getUserLabelByName(REPLIED_LABEL) || GmailApp.createLabel(REPLIED_LABEL);
            thread.addLabel(label);
          } catch (e) { /* non-fatal */ }
        }
      }
    } catch (e) {
      if (typeof console !== 'undefined') console.error('scanForReplies error on row ' + (i + 1) + ': ' + e.message);
    }
  }
  return { flipped: flipped };
}
