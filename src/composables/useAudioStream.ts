import { ref, watch, onUnmounted } from "vue";
import { usePlayerStore } from "../stores/playerStore";
import { getActiveProvider } from "../providers";

let audioCtx: AudioContext | null = null;
let currentSourceNode: AudioBufferSourceNode | null = null;
let gainNode: GainNode | null = null;

// Cache for the pre-fetched next chunk
let cachedBuffer: AudioBuffer | null = null;
let cachedIndex: number | null = null;
let isFetchingNext = false;

export function useAudioStream() {
  const store = usePlayerStore();
  const isLoading = ref(false);

  // Lazy initialize AudioContext on user interaction
  const initAudio = () => {
    if (!audioCtx) {
      // Support fallback web audio contexts
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtx = new AudioCtx();
      
      // Add gain node for volume control and fading
      gainNode = audioCtx.createGain();
      gainNode.connect(audioCtx.destination);
      gainNode.gain.value = 1.0; // Default full volume
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  };

  /**
   * Smoothly fades out the current source and stops it.
   * Ramps gain value to 0 over 0.05 seconds to prevent clicking/popping.
   */
  const fadeAndStop = async (source: AudioBufferSourceNode | null, gain: GainNode | null) => {
    if (!source || !gain || !audioCtx) return;
    
    try {
      const now = audioCtx.currentTime;
      // Cancel scheduled parameter changes
      gain.gain.cancelScheduledValues(now);
      // Fast linear ramp to 0 to prevent pops
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.05);
      
      // Stop the source after the fade completes
      setTimeout(() => {
        try {
          source.stop();
        } catch (e) {
          // Source might already have been stopped
        }
      }, 60);
    } catch (err) {
      console.warn("Error during audio fade-out:", err);
      try {
        source.stop();
      } catch (_) {}
    }
  };

  /**
   * Decodes an ArrayBuffer into an AudioBuffer using the active AudioContext
   */
  const decodeAudio = async (arrayBuffer: ArrayBuffer): Promise<AudioBuffer> => {
    initAudio();
    if (!audioCtx) throw new Error("AudioContext not initialized");
    return await audioCtx.decodeAudioData(arrayBuffer);
  };

  /**
   * Pre-fetches the next chunk in the queue to eliminate latency between sentences.
   */
  const prefetchNextChunk = async (nextIndex: number) => {
    if (nextIndex >= store.textChunks.length || isFetchingNext || cachedIndex === nextIndex) {
      return;
    }

    const nextText = store.textChunks[nextIndex];
    if (!nextText) return;

    try {
      isFetchingNext = true;
      const nextAudioBuffer = await getActiveProvider().generateAudio(nextText, store.activeProfileId);
      const decoded = await decodeAudio(nextAudioBuffer);
      cachedBuffer = decoded;
      cachedIndex = nextIndex;
    } catch (error) {
      console.warn(`[Audio Prefetch] Failed to prefetch chunk ${nextIndex}:`, error);
    } finally {
      isFetchingNext = false;
    }
  };

  /**
   * Main function to play the current active text chunk
   */
  const playCurrentChunk = async () => {
    initAudio();
    if (!audioCtx || !gainNode) return;

    // Stop any current playback
    if (currentSourceNode) {
      await fadeAndStop(currentSourceNode, gainNode);
      currentSourceNode = null;
    }

    const index = store.currentChunkIndex;
    const text = store.textChunks[index];
    if (!text) {
      store.stop();
      return;
    }

    isLoading.value = true;
    store.clearError();

    try {
      let buffer: AudioBuffer;

      // Use pre-fetched cache if available
      if (cachedIndex === index && cachedBuffer) {
        buffer = cachedBuffer;
        cachedBuffer = null;
        cachedIndex = null;
      } else {
        // Fetch and decode immediately
        const audioData = await getActiveProvider().generateAudio(text, store.activeProfileId);
        buffer = await decodeAudio(audioData);
      }

      // Re-check in case user clicked pause/stop while loading
      if (store.playbackState !== "playing" || store.currentChunkIndex !== index) {
        isLoading.value = false;
        return;
      }

      // Create new buffer source node
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(gainNode);

      // Reset gain to full volume smoothly (ramp up over 10ms)
      const now = audioCtx.currentTime;
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(1.0, now + 0.01);

      // Handle natural end of chunk
      source.onended = () => {
        // Only trigger next chunk if this is still the active source
        if (currentSourceNode === source && store.playbackState === "playing") {
          store.nextChunk();
        }
      };

      currentSourceNode = source;
      source.start(0);

      // Trigger pre-fetching for the next chunk
      prefetchNextChunk(index + 1);

    } catch (error: any) {
      console.error("[Audio Composable] Playback error:", error);
      store.setError("Audio source unreachable. Open Settings to configure.");
      store.setProviderHealthy(false);
      store.stop();
    } finally {
      isLoading.value = false;
    }
  };

  // Watch for state changes in Pinia store
  watch(
    () => store.playbackState,
    async (newState, oldState) => {
      if (newState === "playing") {
        if (oldState === "paused" && audioCtx && audioCtx.state === "suspended") {
          audioCtx.resume();
        } else {
          await playCurrentChunk();
        }
      } else if (newState === "paused") {
        if (audioCtx) {
          audioCtx.suspend();
        }
      } else if (newState === "stopped") {
        if (currentSourceNode && gainNode) {
          await fadeAndStop(currentSourceNode, gainNode);
          currentSourceNode = null;
        }
        cachedBuffer = null;
        cachedIndex = null;
      }
    }
  );

  // Watch for index navigation
  watch(
    () => store.currentChunkIndex,
    async () => {
      if (store.playbackState === "playing") {
        await playCurrentChunk();
      }
    }
  );

  // Auto clean up
  onUnmounted(() => {
    if (currentSourceNode) {
      try {
        currentSourceNode.disconnect();
        currentSourceNode.stop();
      } catch (_) {}
    }
    cachedBuffer = null;
    cachedIndex = null;
  });

  return {
    isLoading,
    initAudio,
  };
}
