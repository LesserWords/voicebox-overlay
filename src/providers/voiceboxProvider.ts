import axios, { AxiosInstance } from "axios";
import type { AudioProvider, ProviderConfig, VoiceProfile } from "./types";

/**
 * Adapter for the Qwen3-TTS "voicebox" HTTP API (default :17493).
 * Routes used:
 *   GET  /health             → liveness probe
 *   GET  /profiles           → VoiceProfileResponse[] (returned as bare array)
 *   POST /generate/stream    → audio/wav bytes (single round-trip, no disk)
 */
interface VoiceboxProfile {
  id: string;
  name: string;
  language?: string;
  description?: string | null;
  default_engine?: string | null;
}

export class VoiceboxProvider implements AudioProvider {
  readonly id = "voicebox";
  readonly name = "Voicebox (Qwen3-TTS)";
  readonly isLocal = false;

  private api: AxiosInstance;
  private apiUrl: string;

  constructor(config: ProviderConfig) {
    this.apiUrl = config.apiUrl;
    this.api = this.buildClient(this.apiUrl);
  }

  private buildClient(baseURL: string): AxiosInstance {
    return axios.create({ baseURL, timeout: 60000 });
  }

  configure(config: ProviderConfig): void {
    this.apiUrl = config.apiUrl;
    this.api = this.buildClient(this.apiUrl);
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await this.api.get("/health", { timeout: 2500 });
      // Treat any 2xx as alive; model_loaded:false is still "reachable"
      // (UI shows the banner separately via fetchProfiles failures).
      return res.status >= 200 && res.status < 300;
    } catch {
      return false;
    }
  }

  async fetchProfiles(): Promise<VoiceProfile[]> {
    const response = await this.api.get<VoiceboxProfile[]>("/profiles");
    const raw = Array.isArray(response.data) ? response.data : [];
    return raw.map((p) => ({
      id: p.id,
      name: p.name,
      engine: p.default_engine || "qwen",
    }));
  }

  async generateAudio(text: string, profileId: string): Promise<ArrayBuffer> {
    const response = await this.api.post(
      "/generate/stream",
      { profile_id: profileId, text },
      {
        responseType: "arraybuffer",
        // Long generations on CPU can blow past the default; bump just for this call.
        timeout: 120000,
        headers: { Accept: "audio/wav, application/octet-stream" },
      }
    );
    return response.data;
  }
}
