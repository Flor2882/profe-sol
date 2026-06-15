export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { messages, system } = req.body;
  if (!messages || !system) return res.status(400).json({ error: 'Faltan datos' });
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, system, messages }),
    });
    const data = await response.json();
    const reply = data.content?.map(b => b.text || '').join('') || 'No entendí bien. ¿Me lo preguntas de nuevo?';
    res.status(200).json({ reply });
  } catch (error) {
    res.status(500).json({ error: 'Error del servidor' });
  }
}
