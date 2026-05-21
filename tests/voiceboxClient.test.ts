import { describe, it, expect } from "vitest";
import { voiceboxClient, generateMockBeepWav } from "../src/api/voiceboxClient";

describe("voiceboxClient", () => {
  it("should generate a valid PCM WAV header structure", () => {
    const duration = 0.1; // short beep
    const buffer = generateMockBeepWav(440, duration);
    
    expect(buffer).toBeInstanceOf(ArrayBuffer);
    expect(buffer.byteLength).toBeGreaterThan(44);

    const view = new DataView(buffer);
    
    // Check RIFF header
    const riff = String.fromCharCode(
      view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3)
    );
    expect(riff).toBe("RIFF");

    // Check WAVE header
    const wave = String.fromCharCode(
      view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11)
    );
    expect(wave).toBe("WAVE");
  });

  it("should fetch profiles in mock mode", async () => {
    const profiles = await voiceboxClient.fetchProfiles();
    expect(profiles.length).toBeGreaterThan(0);
    expect(profiles[0]).toHaveProperty("id");
    expect(profiles[0]).toHaveProperty("name");
    expect(profiles[0]).toHaveProperty("engine");
  });

  it("should generate audio buffer in mock mode", async () => {
    const buffer = await voiceboxClient.generateAudio("Hello world testing mock synthesis", "en-us-male-1");
    expect(buffer).toBeInstanceOf(ArrayBuffer);
    expect(buffer.byteLength).toBeGreaterThan(44);
  });
});
