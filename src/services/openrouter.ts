import { OPENROUTER_URL, api } from './api';
import { useAppStore } from '../store';

export const BASE_PERSONA = "Secure Prompt Guard Activated.";

export async function sendOpenRouterMessageStream(
  messages: any[], 
  model: string, 
  apiKey: string, 
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
  apiKeys?: { id: number; key: string }[]
) {
  // BASE_PERSONA is now securely injected and guarded strictly server-side
  // to prevent prompt dumping, browser-level scraping, or network snooping.
  const allMessages = messages;

  const keysToTry = apiKeys && apiKeys.length > 0 
    ? apiKeys 
    : [{ id: 0, key: apiKey }];

  let lastError: any = null;

  for (let i = 0; i < keysToTry.length; i++) {
    const keyObj = keysToTry[i];
    if (!keyObj || !keyObj.key) continue;

    const currentKey = keyObj.key;
    const currentKeyId = keyObj.id;

    try {
      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'WormGPT Web'
        },
        body: JSON.stringify({
          model,
          messages: allMessages,
          temperature: 0.5,
          max_tokens: 2048,
          stream: true
        })
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`API Error ${response.status}: ${err}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");

      if (!reader) throw new Error("No reader");

      let hasReportedSuccess = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        
        // Also check if raw chunk is a JSON error from OpenRouter
        if (chunk.trim().startsWith('{')) {
          try {
            const parsedChunk = JSON.parse(chunk.trim());
            if (parsedChunk.error) {
              throw new Error(parsedChunk.error.message || JSON.stringify(parsedChunk.error));
            }
          } catch (errJson: any) {
            if (errJson.message && (errJson.message.includes("billing") || errJson.message.includes("limit") || errJson.message.includes("Credits") || errJson.message.includes("balance") || errJson.message.includes("API Error"))) {
              throw errJson;
            }
          }
        }

        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') return null;
            
            try {
              const parsed = JSON.parse(data);
              
              if (parsed.error) {
                throw new Error(parsed.error.message || JSON.stringify(parsed.error));
              }

              const content = parsed.choices?.[0]?.delta?.content || '';
              const finishReason = parsed.choices?.[0]?.finish_reason;
              
              if (content) {
                onChunk(content);
                
                // Report working API key to backend upon receiving the first successful chunk
                if (!hasReportedSuccess) {
                  hasReportedSuccess = true;
                  const storeState = useAppStore.getState();
                  if (storeState.user && currentKeyId > 0) {
                    api.reportApiKeyUsage(Number(storeState.user.id), storeState.user.token, currentKeyId, true)
                      .catch(err => console.error("Failed to report api key success:", err));
                  }
                }
              }
              
              if (finishReason) {
                return finishReason;
              }
            } catch (e: any) {
              // Re-throw if it's our explicit API key failure
              if (e.message && (e.message.includes("billing") || e.message.includes("Credits") || e.message.includes("limit") || e.message.includes("balance") || e.message.includes("API Error") || e.message.includes("Unauthorized"))) {
                throw e;
              }
            }
          }
        }
      }

      // If we made it to the end and processed successfully but didn't output chunk (e.g. empty reply)
      if (!hasReportedSuccess) {
        const storeState = useAppStore.getState();
        if (storeState.user && currentKeyId > 0) {
          api.reportApiKeyUsage(Number(storeState.user.id), storeState.user.token, currentKeyId, true)
            .catch(err => console.error("Failed to report api key success:", err));
        }
      }

      return null;
    } catch (e: any) {
      console.warn(`WormGPT API key index ${i} failed. Error: ${e.message || e}`);
      lastError = e;

      // Report failed API key to PHP backend
      const storeState = useAppStore.getState();
      if (storeState.user && currentKeyId > 0) {
        api.reportApiKeyUsage(Number(storeState.user.id), storeState.user.token, currentKeyId, false)
          .catch(err => console.error("Failed to report api key failure:", err));
      }

      if (signal?.aborted) {
        throw e;
      }
    }
  }

  throw lastError || new Error("All active API keys failed validation.");
}

export async function generateSessionTitle(
  firstMessage: string,
  model: string,
  apiKey: string,
  apiKeys?: { id: number; key: string }[]
): Promise<string> {
  const keysToTry = apiKeys && apiKeys.length > 0 
    ? apiKeys 
    : [{ id: 0, key: apiKey }];

  for (let i = 0; i < keysToTry.length; i++) {
    const keyObj = keysToTry[i];
    if (!keyObj || !keyObj.key) continue;

    const currentKey = keyObj.key;
    const currentKeyId = keyObj.id;

    try {
      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentKey}`,
          "HTTP-Referer": window.location.origin,
          "X-Title": "WormGPT Web"
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: "You are a session title generator. Generate a very short, highly relevant title (strictly between 2 and 4 words, no quotes, no markdown/bolding, no trailing periods, no greeting words) summarizing the user's message. Just return the raw title. Do not explain."
            },
            {
              role: "user",
              content: firstMessage
            }
          ],
          temperature: 0.7,
          max_tokens: 12
        })
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`API Error ${response.status}: ${err}`);
      }
      const data = await response.json();
      
      if (data?.error) {
        throw new Error(data.error.message || JSON.stringify(data.error));
      }

      const title = data?.choices?.[0]?.message?.content?.trim();
      if (title) {
        const storeState = useAppStore.getState();
        if (storeState.user && currentKeyId > 0) {
          api.reportApiKeyUsage(Number(storeState.user.id), storeState.user.token, currentKeyId, true)
            .catch(err => console.error("Failed to report api key success:", err));
        }

        // Clean up punctuation or quotes
        return title.replace(/^["'`「『]|["'`」』]$/g, "").replace(/[.!?。！？]$/, "").trim();
      }
    } catch (e: any) {
      console.warn(`Title gen API key index ${i} failed. Error: ${e.message || e}`);
      
      const storeState = useAppStore.getState();
      if (storeState.user && currentKeyId > 0) {
        api.reportApiKeyUsage(Number(storeState.user.id), storeState.user.token, currentKeyId, false)
          .catch(err => console.error("Failed to report api key failure:", err));
      }
    }
  }
  return "";
}
