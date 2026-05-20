// Tests for ClaudeClient.gs

function fakeFetch200(text) {
  return function () {
    return {
      getResponseCode: function () { return 200; },
      getContentText: function () {
        return JSON.stringify({ content: [{ type: 'text', text: text }] });
      }
    };
  };
}

function fakeFetch200Seq(texts) {
  var i = 0;
  return function () {
    var t = texts[Math.min(i, texts.length - 1)];
    i++;
    return {
      getResponseCode: function () { return 200; },
      getContentText: function () {
        return JSON.stringify({ content: [{ type: 'text', text: t }] });
      }
    };
  };
}

function fakeFetchError(code, body) {
  return function () {
    return {
      getResponseCode: function () { return code; },
      getContentText: function () { return body; }
    };
  };
}

registerTest('ClaudeClient: parses good JSON response', function () {
  var result = callClaude('sys', 'user', 'claude-sonnet-4-6', 'sk-ant-x',
    fakeFetch200('{"subject":"Hi","body":"Body — Test Sender"}'));
  assertEqual(result.subject, 'Hi');
  assertContains(result.body, 'Test Sender');
});

registerTest('ClaudeClient: strips code fences around JSON', function () {
  var result = callClaude('sys', 'user', 'claude-sonnet-4-6', 'sk-ant-x',
    fakeFetch200('```json\n{"subject":"Fenced","body":"Hi — Sender"}\n```'));
  assertEqual(result.subject, 'Fenced');
});

registerTest('ClaudeClient: retries once on malformed JSON', function () {
  var result = callClaude('sys', 'user', 'claude-sonnet-4-6', 'sk-ant-x',
    fakeFetch200Seq(['NOT JSON', '{"subject":"OK","body":"Body — Sender"}']));
  assertEqual(result.subject, 'OK');
});

registerTest('ClaudeClient: throws after second malformed response', function () {
  assertThrows(function () {
    callClaude('sys', 'user', 'claude-sonnet-4-6', 'sk-ant-x',
      fakeFetch200('STILL NOT JSON'));
  });
});

registerTest('ClaudeClient: throws on 401', function () {
  assertThrows(function () {
    callClaude('sys', 'user', 'claude-sonnet-4-6', 'sk-ant-x',
      fakeFetchError(401, '{"error":{"message":"bad key"}}'));
  });
});

registerTest('ClaudeClient: throws on missing api key', function () {
  assertThrows(function () {
    callClaude('sys', 'user', 'claude-sonnet-4-6', '', fakeFetch200('{}'));
  });
});

registerTest('ClaudeClient: throws on empty subject + body (Claude declined)', function () {
  assertThrows(function () {
    callClaude('sys', 'user', 'claude-sonnet-4-6', 'sk-ant-x',
      fakeFetch200('{"subject":"","body":""}'));
  });
});

registerTest('ClaudeClient: throws on JSON missing subject', function () {
  assertThrows(function () {
    callClaude('sys', 'user', 'claude-sonnet-4-6', 'sk-ant-x',
      fakeFetch200('{"body":"only body"}'));
  });
});
