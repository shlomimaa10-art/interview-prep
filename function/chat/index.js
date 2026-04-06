const https = require('https');

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

function httpsPost(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const cors = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

module.exports = async function (context, req) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    context.res = { status: 204, headers: cors, body: '' };
    return;
  }

  const { provider, model, system, messages, max_tokens } = req.body || {};

  if (!provider || !messages) {
    context.res = {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing provider or messages' })
    };
    return;
  }

  try {
    let result;

    if (provider === 'anthropic') {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) throw new Error('ANTHROPIC_API_KEY not configured on server');

      const payload = JSON.stringify({
        model: model || 'claude-sonnet-4-5',
        max_tokens: max_tokens || 1000,
        system,
        messages
      });

      const resp = await httpsPost({
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(payload)
        }
      }, payload);

      const data = JSON.parse(resp.body);
      if (data.error) throw new Error(data.error.message);
      result = data.content?.[0]?.text || 'No response';

    } else if (provider === 'openai') {
      const key = process.env.OPENAI_API_KEY;
      if (!key) throw new Error('OPENAI_API_KEY not configured on server');

      const openaiMessages = system
        ? [{ role: 'system', content: system }, ...messages]
        : messages;

      const payload = JSON.stringify({
        model: model || 'gpt-4o',
        max_tokens: max_tokens || 1000,
        messages: openaiMessages
      });

      const resp = await httpsPost({
        hostname: 'api.openai.com',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + key,
          'Content-Length': Buffer.byteLength(payload)
        }
      }, payload);

      const data = JSON.parse(resp.body);
      if (data.error) throw new Error(data.error.message);
      result = data.choices?.[0]?.message?.content || 'No response';

    } else {
      throw new Error('Unknown provider: ' + provider);
    }

    context.res = {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: result })
    };

  } catch (err) {
    context.res = {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
