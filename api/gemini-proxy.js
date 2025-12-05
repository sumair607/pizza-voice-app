// Serverless proxy to forward requests to the Gemini REST API using server-side GEMINI_API_KEY
// Expects POST with JSON body; proxies to GEMINI_API_URL (env) or a default placeholder.

const fetch = require('node-fetch');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.GEMINI_API_KEY;
  const apiUrl = process.env.GEMINI_API_URL || 'https://api.openai.com/v1/chat/completions';

  if (!key) return res.status(500).json({ error: 'Server not configured with GEMINI_API_KEY' });

  try {
    const r = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(req.body),
    });

    const text = await r.text();
    // Forward status and body
    res.status(r.status).set('content-type', r.headers.get('content-type') || 'text/plain').send(text);
  } catch (err) {
    res.status(500).json({ error: (err && err.message) || 'Proxy failed' });
  }
};
