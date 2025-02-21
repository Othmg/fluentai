import { Context } from "@netlify/edge-functions";

export default async (request: Request, context: Context) => {
  try {
    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const body = await request.json();
    const headers = {
      'Authorization': `Bearer ${Netlify.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2'
    };

    // Create thread
    const threadResponse = await fetch('https://api.openai.com/v1/threads', {
      method: 'POST',
      headers
    });

    if (!threadResponse.ok) {
      throw new Error(`Failed to create thread: ${await threadResponse.text()}`);
    }

    const thread = await threadResponse.json();

    // Create message in thread
    const messageResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        role: "user",
        content: body.prompt
      })
    });

    if (!messageResponse.ok) {
      throw new Error(`Failed to create message: ${await messageResponse.text()}`);
    }

    // Create run
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        assistant_id: "asst_mwBvVrwED3NhTkh8NqZDFXBH"
      })
    });

    if (!runResponse.ok) {
      throw new Error(`Failed to create run: ${await runResponse.text()}`);
    }

    const run = await runResponse.json();

    // Poll for completion with timeout
    let runStatus;
    let attempts = 0;
    const maxAttempts = 30; // Maximum 30 seconds

    while (attempts < maxAttempts) {
      try {
        const statusResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
          headers
        });

        if (!statusResponse.ok) {
          throw new Error(`Failed to get run status: ${await statusResponse.text()}`);
        }

        runStatus = await statusResponse.json();

        if (runStatus.status === "completed") {
          break;
        } else if (runStatus.status === "failed" || runStatus.status === "cancelled" || runStatus.status === "expired") {
          throw new Error(`Run failed with status: ${runStatus.status}`);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      } catch (error) {
        if (error.name === 'AbortError') {
          continue; // Try again if it was an abort error
        }
        throw error; // Re-throw other errors
      }
    }

    if (attempts >= maxAttempts) {
      throw new Error('Request timed out after 30 seconds');
    }

    if (runStatus.status === "completed") {
      const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
        headers
      });

      if (!messagesResponse.ok) {
        throw new Error(`Failed to get messages: ${await messagesResponse.text()}`);
      }

      const messages = await messagesResponse.json();
      const lastMessage = messages.data[0];

      if (!lastMessage?.content?.[0]?.text?.value) {
        throw new Error('Invalid message format received from OpenAI');
      }

      try {
        const jsonResponse = JSON.parse(lastMessage.content[0].text.value);
        return new Response(JSON.stringify(jsonResponse), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (parseError) {
        throw new Error(`Failed to parse OpenAI response as JSON: ${parseError.message}`);
      }
    } else {
      throw new Error(`Run failed with status: ${runStatus.status}`);
    }
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({
      error: `OpenAI API Error: ${error.message}`,
      details: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}