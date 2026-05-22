import { defineStore } from "pinia";
import { cleanText, splitIntoChunks } from "../utils/textParser";

export interface VoiceProfile {
  id: string;
  name: string;
  engine: string;
}

export type PlaybackState = "idle" | "playing" | "paused" | "stopped";

export interface AppConfig {
  shortcut: string;
  provider: string;
  api_url: string;
}

export const DEFAULT_CONFIG: AppConfig = {
  shortcut: "alt+shift+space",
  provider: "voicebox",
  api_url: "http://localhost:17493",
};

export const usePlayerStore = defineStore("player", {
  state: () => ({
    textChunks: [] as string[],
    currentChunkIndex: 0,
    playbackState: "idle" as PlaybackState,
    availableProfiles: [] as VoiceProfile[],
    activeProfileId: "" as string,
    errorMessage: "",
    rawText: "",
    /** Last health check result. False = block playback, show config prompt. */
    providerHealthy: false,
    config: { ...DEFAULT_CONFIG } as AppConfig,
  }),
  getters: {
    currentChunk(state): string {
      return state.textChunks[state.currentChunkIndex] || "";
    },
    hasChunks(state): boolean {
      return state.textChunks.length > 0;
    },
    /** Play button enabled only when chunks loaded AND backend reachable. */
    canPlay(state): boolean {
      return state.textChunks.length > 0 && state.providerHealthy;
    },
  },
  actions: {
    loadText(text: string) {
      this.rawText = text;
      const cleaned = cleanText(text);
      this.textChunks = splitIntoChunks(cleaned);
      this.currentChunkIndex = 0;
      this.playbackState = "idle";
      this.errorMessage = "";
    },
    play() {
      if (this.hasChunks && this.providerHealthy) {
        this.playbackState = "playing";
      } else if (!this.providerHealthy) {
        this.setError("Audio source unreachable. Open Settings to configure.");
      }
    },
    pause() {
      if (this.playbackState === "playing") {
        this.playbackState = "paused";
      }
    },
    stop() {
      this.playbackState = "stopped";
      this.currentChunkIndex = 0;
    },
    nextChunk() {
      if (this.currentChunkIndex < this.textChunks.length - 1) {
        this.currentChunkIndex++;
      } else {
        this.stop();
      }
    },
    prevChunk() {
      if (this.currentChunkIndex > 0) {
        this.currentChunkIndex--;
      }
    },
    setAvailableProfiles(profiles: VoiceProfile[]) {
      this.availableProfiles = profiles;
      // Reset active profile if the current one no longer exists (provider switched)
      if (profiles.length > 0 && !profiles.some((p) => p.id === this.activeProfileId)) {
        this.activeProfileId = profiles[0].id;
      }
      if (profiles.length === 0) {
        this.activeProfileId = "";
      }
    },
    setActiveProfileId(id: string) {
      this.activeProfileId = id;
    },
    setError(msg: string) {
      this.errorMessage = msg;
    },
    clearError() {
      this.errorMessage = "";
    },
    setProviderHealthy(ok: boolean) {
      this.providerHealthy = ok;
    },
    setConfig(cfg: AppConfig) {
      this.config = cfg;
    },
  },
});
