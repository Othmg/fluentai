import { Context } from "@netlify/edge-functions";

export default async (request: Request, context: Context) => {
    try {
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

        return new Response(JSON.stringify({
            threadId: thread.id,
            runId: run.id
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Edge function error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}