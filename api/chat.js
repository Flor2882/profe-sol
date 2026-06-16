export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const body = await req.json();
    const { messages, system } = body;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system,
        messages,
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      return new Response(JSON.stringify({ reply: 'Error Anthropic: ' + JSON.stringify(data.error) }), { status: 200 });
    }
    
    const reply = data.content?.map(b => b.text || '').join('') || 'No entendí bien.';
    return new Response(JSON.stringify({ reply }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    return new Response(JSON.stringify({ reply: 'Error catch: ' + error.message }), { status: 200 });
  }
}
