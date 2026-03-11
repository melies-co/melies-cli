import { loadConfig } from './config';

interface RequestOptions {
  method?: string;
  body?: Record<string, unknown>;
  query?: Record<string, string | number>;
  token?: string;
}

export interface Model {
  id: string;
  name: string;
  type: string;
  description?: string;
  credits?: number;
  enabled: boolean;
}

export interface Asset {
  _id: string;
  name: string;
  type: string;
  toolId?: string;
  url?: string;
  prompt?: string;
  model?: string;
  status: string;
  error?: string;
  createdAt: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  accountIds: Array<{
    _id: string;
    name: string;
    plan: string;
    credits: number;
  }>;
}

export class MeliesAPI {
  private apiUrl: string;
  private token?: string;

  constructor(token?: string) {
    const config = loadConfig();
    this.apiUrl = config.apiUrl;
    this.token = token || config.token;
  }

  private async request(path: string, options: RequestOptions = {}): Promise<any> {
    const { method = 'GET', body, query, token } = options;
    const authToken = token || this.token;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const fetchOptions: RequestInit = { method, headers };
    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }

    let url = `${this.apiUrl}${path}`;
    if (query) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null) params.set(k, String(v));
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      const text = await response.text();
      let errorMsg: string;
      try {
        const json = JSON.parse(text);
        errorMsg = json.error?.message || json.statusMessage || json.error || text;
      } catch {
        errorMsg = text;
      }
      throw new Error(`API error (${response.status}): ${errorMsg}`);
    }
    return response.json();
  }

  // Auth
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    return this.request('/user/login', {
      method: 'POST',
      body: { email, password },
    });
  }

  // User
  async getUser(): Promise<{ user: User }> {
    return this.request('/user', { method: 'GET' });
  }

  // Credits
  async getCreditStats(granularity?: string): Promise<any> {
    return this.request('/user/credits/stats', {
      method: 'POST',
      body: { granularity: granularity || 'month' },
    });
  }

  // Models (V2, public, no auth needed)
  async getModels(type?: string): Promise<{ models: Model[]; modelsByType: Record<string, Model[]> }> {
    return this.request('/v2/models', { method: 'GET' });
  }

  // V2 Tool execution (image, video, poster)
  async executeTool(toolId: string, params: Record<string, unknown>): Promise<{ assetId: string; status: string }> {
    return this.request(`/v2/tools/${toolId}`, {
      method: 'POST',
      body: params,
    });
  }

  // References (actors, objects)
  async getReferences(): Promise<{ references: any[] }> {
    return this.request('/v2/references', { method: 'GET' });
  }

  async generateReference(imageUrls: string[], label: string, type: string = 'actor'): Promise<{ referenceId: string; status: string }> {
    return this.request('/v2/references/generate', {
      method: 'POST',
      body: { imageUrls, label, type },
    });
  }

  async createReference(label: string, type: string, thumbnailUrl: string, fullUrl: string): Promise<{ reference: any }> {
    return this.request('/v2/references', {
      method: 'POST',
      body: { label, type, thumbnailUrl, fullUrl, r2Url: fullUrl },
    });
  }

  async deleteReference(id: string): Promise<void> {
    return this.request(`/v2/references/${id}`, { method: 'DELETE' });
  }

  // V2 Assets
  async getAssets(options?: { limit?: number; offset?: number; toolId?: string }): Promise<{ assets: Asset[] }> {
    return this.request('/v2/assets', {
      method: 'GET',
      query: {
        limit: options?.limit || 50,
        offset: options?.offset || 0,
        ...(options?.toolId ? { toolId: options.toolId } : {}),
      },
    });
  }
}
