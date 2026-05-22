import axios, { AxiosInstance } from "axios";
import type { AudioProvider, ProviderConfig, VoiceProfile } from "./types";

export class VoiceboxProvider implements AudioProvider {
  readonly id = "voicebox";
  readonly name = "Voicebox (local API)";
  readonly isLocal = false;

  private api: AxiosInstance;
  private apiUrl: string;

  constructor(config: ProviderConfig) {
    this.apiUrl = config.apiUrl;
    this.api = axios.create({ baseURL: this.apiUrl, timeout: 5000 });
  }

  configure(config: ProviderConfig): void {
    this.apiUrl = config.apiUrl;
    this.api = axios.create({ baseURL: this.apiUrl, timeout: 5000 });
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Hit profiles endpoint as a cheap liveness probe.
      const res = await this.api.get("/api/profiles", { timeout: 2000 });
      return res.status >= 200 && res.status < 300;
    } catch {
      return false;
    }
  }

  async fetchProfiles(): Promise<VoiceProfile[]> {
    const response = await this.api.get<{ profiles: VoiceProfile[] }>("/api/profiles");
    return response.data.profiles || [];
  }

  async generateAudio(text: string, profileId: string): Promise<ArrayBuffer> {
    const response = await this.api.post(
      "/api/generate",
      { text, profile_id: profileId },
      { responseType: "arraybuffer" }
    );
    return response.data;
  }
}
