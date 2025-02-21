import { Context } from "@netlify/edge-functions";

export default async (request: Request, context: Context) => {
  try {
    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const body = await request.json();
    
    // Create thread and message
    const threadResponse = await fetch('https://api.openai.com/v1/threads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Netlify.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v1'
      }
    });
    
    const thread = await threadResponse.json();
    
    // Create message in thread
    await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Netlify.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v1'
      },
      body: JSON.stringify({
        role: "user",
        content: body.prompt
      })
    });

    // Create run
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Netlify.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v1'
      },
      body: JSON.stringify({
        assistant_id: "asst_mwBvVrwED3NhTkh8NqZDFXBH"
      })
    });

    const run = await runResponse.json();

    // Poll for completion
    let runStatus;
    do {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const statusResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
        headers: {
          'Authorization': `Bearer ${Netlify.env.get('OPENAI_API_KEY')}`,
          'OpenAI-Beta': 'assistants=v1'
        }
      });
      runStatus = await statusResponse.json();
    } while (runStatus.status === "in_progress" || runStatus.status === "queued");

    if (runStatus.status === "completed") {
      const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
        headers: {
          'Authorization': `Bearer ${Netlify.env.get('OPENAI_API_KEY')}`,
          'OpenAI-Beta': 'assistants=v1'
        }
      });
      const messages = await messagesResponse.json();
      
      return new Response(JSON.stringify(messages.data[0].content[0].text.value), {
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      throw new Error(`Run failed with status: ${runStatus.status}`);
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}