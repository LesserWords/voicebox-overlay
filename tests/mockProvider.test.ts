import { describe, it, expect } from "vitest";
import { MockProvider } from "../src/providers/mockProvider";

describe("MockProvider", () => {
  const provider = new MockProvider();

  it("reports available", async () => {
    expect(await provider.isAvailable()).toBe(true);
  });

  it("returns profiles with required fields", async () => {
    const profiles = await provider.fetchProfiles();
    expect(profiles.length).toBeGreaterThan(0);
    expect(profiles[0]).toHaveProperty("id");
    expect(profiles[0]).toHaveProperty("name");
    expect(profiles[0]).toHaveProperty("engine");
  });

  it("generates a valid PCM WAV buffer", async () => {
    const buffer = await provider.generateAudio("Hello world testing mock synthesis", "mock-en-male-1");
    expect(buffer).toBeInstanceOf(ArrayBuffer);
    expect(buffer.byteLength).toBeGreaterThan(44);

    const view = new DataView(buffer);
    const riff = String.fromCharCode(
      view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3)
    );
    expect(riff).toBe("RIFF");
    const wave = String.fromCharCode(
      view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11)
    );
    expect(wave).toBe("WAVE");
  });
});
