import { defineStore } from "pinia";
import { cleanText, splitIntoChunks } from "../utils/textParser";

export interface VoiceProfile {
  id: string;
  name: string;
  engine: string;
}

export type PlaybackState = "idle" | "playing" | "paused" | "stopped";

export const usePlayerStore = defineStore("player", {
  state: () => ({
    textChunks: [] as string[],
    currentChunkIndex: 0,
    playbackState: "idle" as PlaybackState,
    availableProfiles: [] as VoiceProfile[],
    activeProfileId: "" as string,
    isMockMode: false,
    errorMessage: "",
    rawText: "",
  }),
  getters: {
    currentChunk(state): string {
      return state.textChunks[state.currentChunkIndex] || "";
    },
    hasChunks(state): boolean {
      return state.textChunks.length > 0;
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
      if (this.hasChunks) {
        this.playbackState = "playing";
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
      if (profiles.length > 0 && !this.activeProfileId) {
        this.activeProfileId = profiles[0].id;
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
  },
});
