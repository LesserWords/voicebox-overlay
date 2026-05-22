import type { AudioProvider, ProviderConfig } from "./types";
import { VoiceboxProvider } from "./voiceboxProvider";
import { MockProvider } from "./mockProvider";

export type ProviderFactory = (config: ProviderConfig) => AudioProvider;

/**
 * Registry of providers. Add new ones here — anything implementing
 * `AudioProvider` plugs in without touching call sites.
 */
const FACTORIES: Record<string, ProviderFactory> = {
  voicebox: (cfg) => new VoiceboxProvider(cfg),
  mock: (_cfg) => new MockProvider(),
};

export interface ProviderInfo {
  id: string;
  name: string;
}

/** UI helper for Settings dropdown. */
export function listProviders(): ProviderInfo[] {
  // Build a throwaway instance per id just to read its .name; cheap enough.
  return Object.keys(FACTORIES).map((id) => {
    const inst = FACTORIES[id]({ apiUrl: "" });
    return { id, name: inst.name };
  });
}

let active: AudioProvider | null = null;

export function setActiveProvider(id: string, config: ProviderConfig): AudioProvider {
  const factory = FACTORIES[id] ?? FACTORIES.voicebox;
  active = factory(config);
  return active;
}

export function getActiveProvider(): AudioProvider {
  if (!active) {
    // Lazy default so callers never get null.
    active = new VoiceboxProvider({ apiUrl: "http://localhost:17493" });
  }
  return active;
}

export type { AudioProvider, ProviderConfig, VoiceProfile } from "./types";
