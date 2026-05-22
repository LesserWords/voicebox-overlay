import type { AudioProvider, ProviderConfig, VoiceProfile } from "./types";

/**
 * Generates a short, gentle sine-wave WAV. Used ONLY when the user
 * explicitly selects the mock provider — never as a silent fallback,
 * since random beeps for narration are painful.
 */
function generateBeepWav(frequency = 440, duration = 0.6): ArrayBuffer {
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeString = (v: DataView, offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) v.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let amplitude = 0.4; // softer than 1.0 to avoid ear pain
    if (t < 0.05) amplitude *= t / 0.05;
    else if (t > duration - 0.08) amplitude *= Math.max(0, (duration - t) / 0.08);
    const sample = Math.sin(2 * Math.PI * frequency * t) * amplitude;
    view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, sample)) * 0x7fff, true);
  }
  return buffer;
}

export class MockProvider implements AudioProvider {
  readonly id = "mock";
  readonly name = "Mock (offline beeps)";
  readonly isLocal = true;

  configure(_config: ProviderConfig): void {
    // no-op
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async fetchProfiles(): Promise<VoiceProfile[]> {
    return [
      { id: "mock-en-male-1", name: "Mock English (Male)", engine: "mock-tts" },
      { id: "mock-en-female-1", name: "Mock English (Female)", engine: "mock-tts" },
      { id: "mock-pt-female-1", name: "Mock Portuguese (Female)", engine: "mock-tts" },
    ];
  }

  async generateAudio(text: string, _profileId: string): Promise<ArrayBuffer> {
    const words = text.split(/\s+/).filter(Boolean).length || 1;
    const frequency = 280 + (words * 17) % 160; // 280-440 Hz, easier on ears
    const duration = Math.min(2.5, 0.4 + words * 0.12);
    await new Promise((r) => setTimeout(r, 150));
    return generateBeepWav(frequency, duration);
  }
}
