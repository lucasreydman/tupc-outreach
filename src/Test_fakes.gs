// Test doubles for Claude, Gmail, Drive, and Spreadsheet APIs.
// Each fake exposes only the surface that production code actually uses.
// They are referenced from Test_*.gs files and never from production code.

function FakeClaude(opts) {
  var self = {};
  self.calls = [];
  self.nextResponse = (opts && opts.nextResponse) || { subject: 'Test subject', body: 'Test body — signed by Test Sender' };
  self.shouldThrow = (opts && opts.shouldThrow) || false;
  self.call = function (systemPrompt, userMessage, model, apiKey) {
    self.calls.push({ systemPrompt: systemPrompt, userMessage: userMessage, model: model, apiKey: apiKey });
    if (self.shouldThrow) throw new Error('FakeClaude error');
    return self.nextResponse;
  };
  return self;
}

function FakeGmail() {
  var self = {};
  self.sent = [];
  self.threads = {};
  self.sendEmail = function (to, subject, plainBody, opts) {
    var threadId = 't_' + (self.sent.length + 1);
    var date = new Date();
    self.sent.push({ to: to, subject: subject, plainBody: plainBody, opts: opts || {}, threadId: threadId, date: date });
    self.threads[threadId] = { messages: [{ from: 'sender@example.com', to: to, date: date, body: plainBody }] };
    return { threadId: threadId };
  };
  self.getThreadById = function (id) {
    var t = self.threads[id];
    if (!t) return null;
    return {
      getMessages: function () {
        return t.messages.map(function (m) {
          return {
            getFrom: function () { return m.from; },
            getDate: function () { return m.date; },
            getPlainBody: function () { return m.body; }
          };
        });
      },
      reply: function (body, replyOpts) {
        t.messages.push({ from: 'sender@example.com', to: t.messages[0].to, date: new Date(), body: body, opts: replyOpts });
      },
      addLabel: function (label) { /* no-op */ }
    };
  };
  self.simulateInboundReply = function (threadId, fromAddr) {
    var t = self.threads[threadId];
    if (!t) throw new Error('No such thread: ' + threadId);
    t.messages.push({ from: fromAddr, to: 'sender@example.com', date: new Date(Date.now() + 1000), body: 'Replying' });
  };
  return self;
}

function FakeSheet(headers, rows) {
  var data = [headers.slice()].concat((rows || []).map(function (r) { return r.slice(); }));
  var self = {};
  self.getDataRange = function () {
    return {
      getValues: function () { return data.map(function (r) { return r.slice(); }); }
    };
  };
  self.appendRow = function (row) { data.push(row.slice()); };
  self.getRange = function (row, col, numRows, numCols) {
    return {
      setValue: function (v) {
        ensureRow(data, row - 1, data[0] ? data[0].length : col);
        data[row - 1][col - 1] = v;
      },
      setValues: function (vs) {
        for (var i = 0; i < (numRows || vs.length); i++) {
          for (var j = 0; j < (numCols || vs[0].length); j++) {
            ensureRow(data, row - 1 + i, (data[0] ? data[0].length : col + j));
            data[row - 1 + i][col - 1 + j] = vs[i][j];
          }
        }
      },
      getValue: function () { return data[row - 1] ? data[row - 1][col - 1] : undefined; },
      getValues: function () {
        var out = [];
        for (var i = 0; i < (numRows || 1); i++) {
          var r = [];
          for (var j = 0; j < (numCols || 1); j++) r.push(data[row - 1 + i] ? data[row - 1 + i][col - 1 + j] : undefined);
          out.push(r);
        }
        return out;
      },
      setDataValidation: function (rule) { /* no-op */ }
    };
  };
  self.getLastRow = function () { return data.length; };
  self.getLastColumn = function () { return data[0] ? data[0].length : 0; };
  self.getMaxRows = function () { return Math.max(data.length, 100); };
  self.clearContents = function () { data = []; };
  self.setFrozenRows = function (n) { /* no-op */ };
  self.setColumnWidth = function (i, w) { /* no-op */ };
  self._data = function () { return data; };
  return self;
}

function ensureRow(data, rowIdx, colCount) {
  while (data.length <= rowIdx) {
    var r = [];
    for (var c = 0; c < colCount; c++) r.push('');
    data.push(r);
  }
  while (data[rowIdx].length < colCount) data[rowIdx].push('');
}

function FakeSpreadsheet() {
  var self = {};
  var sheets = {};
  self.getSheetByName = function (name) { return sheets[name] || null; };
  self.insertSheet = function (name) {
    var s = FakeSheet([], []);
    s.getName = function () { return name; };
    sheets[name] = s;
    return s;
  };
  self.getSheets = function () {
    return Object.keys(sheets).map(function (n) { return sheets[n]; });
  };
  return self;
}

function FakeDrive(deckBlob) {
  return {
    getFileById: function (id) {
      return {
        getBlob: function () { return deckBlob || 'fake-blob'; },
        getName: function () { return 'deck.pdf'; }
      };
    }
  };
}
