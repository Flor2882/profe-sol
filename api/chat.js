export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const body = await req.json();
    const { messages, system } = body;

    // Comprimir imágenes en base64 si son muy grandes
    const processedMessages = messages.map(msg => {
      if (Array.isArray(msg.content)) {
        return {
          ...msg,
          content: msg.content.map(block => {
            if (block.type === 'image' && block.source?.data) {
              return block;
            }
            return block;
          })
        };
      }
      return msg;
    });

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
        messages: processedMessages,
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      return new Response(JSON.stringify({ error: data.error.message, reply: 'Hubo un error. ¿Lo intentamos de nuevo?' }), { status: 200 });
    }
    
    const reply = data.content?.map(b => b.text || '').join('') || 'No entendí bien. ¿Me lo preguntas de nuevo?';
    return new Response(JSON.stringify({ reply }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    return new Response(JSON.stringify({ reply: 'Error: ' + error.message }), { status: 200 });
  }
}
