export interface VoiceProfile {
  id: string;
  name: string;
  engine: string;
}

export interface ProviderConfig {
  apiUrl: string;
}

export interface AudioProvider {
  /** Stable id used in config (e.g. "voicebox", "mock"). */
  readonly id: string;
  /** Human-readable label shown in Settings dropdown. */
  readonly name: string;
  /** True if this provider does not need a running external service. */
  readonly isLocal: boolean;
  /** Re-apply config (called whenever user updates settings). */
  configure(config: ProviderConfig): void;
  /** Cheap probe — used to disable UI / show config prompt when backend is down. */
  isAvailable(): Promise<boolean>;
  /** List available voices. Throws on hard failure. */
  fetchProfiles(): Promise<VoiceProfile[]>;
  /** Synthesize text. Throws on failure — callers must NOT fall back to a beep. */
  generateAudio(text: string, profileId: string): Promise<ArrayBuffer>;
}
