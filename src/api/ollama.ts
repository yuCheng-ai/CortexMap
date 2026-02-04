
export interface OllamaModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    parent_model: string;
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

const getOllamaBaseUrl = () => {
  const envUrl = import.meta.env.VITE_OLLAMA_BASE_URL;
  if (envUrl) {
    // If user provided a URL ending in /v1, strip it to support native Ollama API
    // If user provided a URL ending in /api, use it as is
    // Otherwise append /api
    const cleanUrl = envUrl.replace(/\/v1\/?$/, '').replace(/\/api\/?$/, '');
    return `${cleanUrl}/api`;
  }
  return 'http://127.0.0.1:11434/api';
};

const OLLAMA_BASE = getOllamaBaseUrl();

export const ollamaClient = {
  async isAlive(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout for health check
      const response = await fetch(`${OLLAMA_BASE}/tags`, { 
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response.ok;
    } catch (e) {
      return false;
    }
  },

  async listModels(): Promise<OllamaModel[]> {
    try {
      const response = await fetch(`${OLLAMA_BASE}/tags`, { method: 'GET' });
      if (!response.ok) return [];
      const data = await response.json();
      return data.models || [];
    } catch (e) {
      console.error('Failed to list models:', e);
      return [];
    }
  },

  async chat(model: string, messages: { role: string; content: string }[], onChunk?: (text: string) => void): Promise<string> {
    const controller = new AbortController();
    // Default 60s timeout for initial connection/response, but stream reading has its own flow
    const timeoutId = setTimeout(() => controller.abort(), 60000); 

    try {
      const response = await fetch(`${OLLAMA_BASE}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          stream: !!onChunk,
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.statusText}`);
      }

      if (onChunk && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const json: OllamaChatResponse = JSON.parse(line);
              const content = json.message.content;
              fullText += content;
              onChunk(content);
            } catch (e) {
              console.error('Error parsing Ollama chunk', e);
            }
          }
        }
        return fullText;
      } else {
        const json: OllamaChatResponse = await response.json();
        return json.message.content;
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Ollama request timed out');
      }
      throw error;
    }
  }
};
