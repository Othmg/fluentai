import { Context } from "@netlify/edge-functions";

export default async (request: Request, context: Context) => {
    try {
        const url = new URL(request.url);
        const threadId = url.searchParams.get('threadId');
        const runId = url.searchParams.get('runId');

        if (!threadId || !runId) {
            return new Response(JSON.stringify({ error: 'Missing threadId or runId' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const headers = {
            'Authorization': `Bearer ${Netlify.env.get('OPENAI_API_KEY')}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2'
        };

        const statusResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
            headers
        });

        if (!statusResponse.ok) {
            throw new Error(`Failed to get run status: ${await statusResponse.text()}`);
        }

        const runStatus = await statusResponse.json();

        if (runStatus.status === "completed") {
            const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
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
                return new Response(JSON.stringify({
                    status: runStatus.status,
                    completed: true,
                    data: jsonResponse
                }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (parseError) {
                throw new Error(`Failed to parse OpenAI response as JSON: ${parseError.message}`);
            }
        }

        return new Response(JSON.stringify({
            status: runStatus.status,
            completed: false
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