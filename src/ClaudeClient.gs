// Anthropic Messages API wrapper.
// callClaude(systemPrompt, userMessage, model, apiKey, fetchImpl?) -> {subject, body}
// Retries once if Claude's text response isn't strict JSON; throws on 4xx/5xx or after
// the second malformed response.
//
// fetchImpl is dependency-injected so tests can pass a fake without going over the wire.

var ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
var ANTHROPIC_VERSION = '2023-06-01';
var CLAUDE_MAX_TOKENS = 1024;

function callClaude(systemPrompt, userMessage, model, apiKey, fetchImpl) {
  var fetch = fetchImpl || function (url, opts) { return UrlFetchApp.fetch(url, opts); };
  if (!apiKey) throw new Error('Missing anthropic_api_key in Config tab');

  var body = {
    model: model || 'claude-sonnet-4-6',
    max_tokens: CLAUDE_MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }]
  };

  var lastErr = null;
  for (var attempt = 1; attempt <= 2; attempt++) {
    var resp = fetch(ANTHROPIC_URL, {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION
      },
      payload: JSON.stringify(body),
      muteHttpExceptions: true
    });
    var code = resp.getResponseCode();
    var text = resp.getContentText();
    if (code !== 200) {
      throw new Error('Claude API ' + code + ': ' + String(text).substring(0, 500));
    }
    var parsed;
    try { parsed = JSON.parse(text); } catch (e) {
      throw new Error('Claude returned non-JSON envelope: ' + String(text).substring(0, 200));
    }
    var content = parsed.content && parsed.content[0] && parsed.content[0].text;
    if (!content) throw new Error('Claude returned empty content');

    // Strip code fences if Claude wrapped JSON in ```json ... ```
    var cleaned = String(content).trim();
    if (cleaned.indexOf('```') === 0) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    }

    try {
      var obj = JSON.parse(cleaned);
      if (typeof obj.subject !== 'string' || typeof obj.body !== 'string') {
        throw new Error('Claude JSON missing subject or body');
      }
      if (obj.subject === '' && obj.body === '') {
        throw new Error('Claude declined to generate (empty subject and body)');
      }
      return obj;
    } catch (e) {
      lastErr = e;
      continue;
    }
  }
  throw new Error('Claude returned malformed content after 2 attempts: ' + ((lastErr && lastErr.message) || 'unknown'));
}
