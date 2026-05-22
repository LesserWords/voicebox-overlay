import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { usePlayerStore } from "../src/stores/playerStore";

describe("playerStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("should initialize with default states", () => {
    const store = usePlayerStore();
    expect(store.textChunks).toEqual([]);
    expect(store.currentChunkIndex).toBe(0);
    expect(store.playbackState).toBe("idle");
    expect(store.errorMessage).toBe("");
  });

  it("should load text, clean it, and chunk it correctly", () => {
    const store = usePlayerStore();
    store.loadText("Hello world! This is [link](http://test.com) test.");
    expect(store.rawText).toBe("Hello world! This is [link](http://test.com) test.");
    expect(store.textChunks).toEqual(["Hello world!", "This is link test."]);
    expect(store.currentChunkIndex).toBe(0);
    expect(store.playbackState).toBe("idle");
  });

  it("should update playback state to playing when play is called with chunks and healthy provider", () => {
    const store = usePlayerStore();
    store.setProviderHealthy(true);
    store.play();
    expect(store.playbackState).toBe("idle"); // shouldn't play empty

    store.loadText("Sentence one. Sentence two.");
    store.play();
    expect(store.playbackState).toBe("playing");
  });

  it("should block play when provider is unhealthy and set error", () => {
    const store = usePlayerStore();
    store.loadText("Sentence one.");
    store.setProviderHealthy(false);
    store.play();
    expect(store.playbackState).toBe("idle");
    expect(store.errorMessage).toMatch(/unreachable/i);
  });

  it("should pause and stop correctly", () => {
    const store = usePlayerStore();
    store.setProviderHealthy(true);
    store.loadText("Sentence one. Sentence two.");
    store.play();
    expect(store.playbackState).toBe("playing");

    store.pause();
    expect(store.playbackState).toBe("paused");

    store.stop();
    expect(store.playbackState).toBe("stopped");
    expect(store.currentChunkIndex).toBe(0);
  });

  it("should navigate chunks and stop at the end", () => {
    const store = usePlayerStore();
    store.setProviderHealthy(true);
    store.loadText("Sentence one. Sentence two.");
    store.play();

    store.nextChunk();
    expect(store.currentChunkIndex).toBe(1);

    store.nextChunk(); // reached end
    expect(store.playbackState).toBe("stopped");
    expect(store.currentChunkIndex).toBe(0);
  });
});
