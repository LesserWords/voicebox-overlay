import axios from "axios";

export interface VoiceProfile {
  id: string;
  name: string;
  engine: string;
}

const VOICEBOX_BASE_URL = "http://localhost:17493";

const api = axios.create({
  baseURL: VOICEBOX_BASE_URL,
  timeout: 5000,
});

// Helper to check if mock mode should be active
const isMockConfigured = (): boolean => {
  return import.meta.env.VITE_USE_MOCK_API === "true" || import.meta.env.DEV;
};

/**
 * Programmatically generates a short 16-bit PCM WAV beep file.
 * Used to test audio decoding and playback when the Voicebox API is offline.
 */
export function generateMockBeepWav(frequency = 440, duration = 0.6): ArrayBuffer {
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeString = (v: DataView, offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      v.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  /* RIFF identifier */
  writeString(view, 0, "RIFF");
  /* File length */
  view.setUint32(4, 36 + numSamples * 2, true);
  /* RIFF type */
  writeString(view, 8, "WAVE");
  /* Format chunk identifier */
  writeString(view, 12, "fmt ");
  /* Format chunk length */
  view.setUint32(16, 16, true);
  /* Sample format (raw PCM = 1) */
  view.setUint16(20, 1, true);
  /* Channel count (1 = mono) */
  view.setUint16(22, 1, true);
  /* Sample rate */
  view.setUint32(24, sampleRate, true);
  /* Byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * 2, true);
  /* Block align (channel count * bytes per sample) */
  view.setUint16(32, 2, true);
  /* Bits per sample */
  view.setUint16(34, 16, true);
  /* Data chunk identifier */
  writeString(view, 36, "data");
  /* Data chunk length */
  view.setUint32(40, numSamples * 2, true);

  // Write sine wave samples with a slight volume envelope to avoid clicks
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let amplitude = 1.0;
    
    // Attack envelope (first 0.05 seconds)
    if (t < 0.05) {
      amplitude = t / 0.05;
    }
    // Decay envelope (last 0.08 seconds)
    else if (t > duration - 0.08) {
      amplitude = Math.max(0, (duration - t) / 0.08);
    }

    const sample = Math.sin(2 * Math.PI * frequency * t) * amplitude;
    const val = Math.max(-1, Math.min(1, sample)) * 0x7fff;
    view.setInt16(44 + i * 2, val, true);
  }

  return buffer;
}

export const voiceboxClient = {
  async fetchProfiles(): Promise<VoiceProfile[]> {
    if (isMockConfigured()) {
      console.log("[Voicebox API] Running in Mock mode: returning fallback profiles.");
      return [
        { id: "en-us-male-1", name: "Mock English (Male 1)", engine: "mock-tts" },
        { id: "en-us-female-1", name: "Mock English (Female 1)", engine: "mock-tts" },
        { id: "pt-br-female-1", name: "Mock Portuguese (Female 1)", engine: "mock-tts" },
      ];
    }

    try {
      const response = await api.get<{ profiles: VoiceProfile[] }>("/api/profiles");
      return response.data.profiles || [];
    } catch (error) {
      console.warn("[Voicebox API] Failed to fetch profiles, falling back to mock mode:", error);
      // Fallback if server is not reachable
      return [
        { id: "en-us-male-1", name: "Offline Mock (Male 1)", engine: "mock-tts" },
        { id: "en-us-female-1", name: "Offline Mock (Female 1)", engine: "mock-tts" },
      ];
    }
  },

  async generateAudio(text: string, profileId: string): Promise<ArrayBuffer> {
    if (isMockConfigured() || profileId.startsWith("mock-") || profileId.includes("Offline")) {
      // Mock synthesis: generate a slightly different pitch depending on the word count
      const words = text.split(" ").length;
      const frequency = 300 + (words * 20) % 300; // Pitch varies with length
      const duration = Math.min(3.0, 0.4 + words * 0.15); // Duration varies with length
      
      // Delay to simulate API network response latency (300ms)
      await new Promise((resolve) => setTimeout(resolve, 300));
      return generateMockBeepWav(frequency, duration);
    }

    try {
      const response = await api.post("/api/generate", {
        text,
        profile_id: profileId,
      }, {
        responseType: "arraybuffer",
      });
      return response.data;
    } catch (error) {
      console.warn("[Voicebox API] Generation failed, generating fallback audio:", error);
      return generateMockBeepWav(350, 1.0);
    }
  }
};
