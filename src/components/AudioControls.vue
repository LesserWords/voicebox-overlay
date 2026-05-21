<script setup lang="ts">
import { Play, Pause, Square, SkipBack, SkipForward, Sparkles, ChevronDown } from "@lucide/vue";
import { usePlayerStore } from "../stores/playerStore";
import { useAudioStream } from "../composables/useAudioStream";

const store = usePlayerStore();
const { initAudio } = useAudioStream();

const handlePlay = () => {
  initAudio();
  store.play();
};

const handlePause = () => {
  store.pause();
};

const handleStop = () => {
  store.stop();
};

const handleNext = () => {
  store.nextChunk();
};

const handlePrev = () => {
  store.prevChunk();
};
</script>

<template>
  <div class="flex flex-col space-y-4 w-full bg-slate-900/60 border border-white/5 rounded-xl p-4 backdrop-blur-md">
    <!-- Voice Profile Selector & Volume -->
    <div class="flex items-center justify-between space-x-3 text-sm">
      <div class="flex items-center space-x-2 text-slate-300 flex-1 min-w-0">
        <Sparkles class="h-4 w-4 text-amber-400 shrink-0 animate-pulse-slow" />
        <div class="relative flex-1 min-w-0">
          <select
            v-model="store.activeProfileId"
            class="w-full bg-slate-950/80 border border-white/10 rounded-lg px-2.5 py-1.5 pr-8 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500/50 appearance-none cursor-pointer truncate"
          >
            <option
              v-for="profile in store.availableProfiles"
              :key="profile.id"
              :value="profile.id"
            >
              {{ profile.name }}
            </option>
          </select>
          <ChevronDown class="absolute right-2 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        </div>
      </div>
      
      <!-- Audio Visualizer Indicator -->
      <div v-if="store.playbackState === 'playing'" class="flex items-end space-x-0.5 h-3 shrink-0 px-2">
        <div class="w-0.5 bg-amber-400 rounded-full animate-[barPulse_0.6s_ease-in-out_infinite]"></div>
        <div class="w-0.5 bg-amber-400 rounded-full animate-[barPulse_0.8s_ease-in-out_infinite_0.15s]"></div>
        <div class="w-0.5 bg-amber-400 rounded-full animate-[barPulse_0.5s_ease-in-out_infinite_0.3s]"></div>
      </div>
    </div>

    <!-- Main Audio Control Panel -->
    <div class="flex items-center justify-center space-x-3">
      <!-- Skip Backwards -->
      <button
        @click="handlePrev"
        :disabled="!store.hasChunks || store.currentChunkIndex === 0"
        class="p-2 rounded-lg bg-slate-950/50 hover:bg-slate-800/80 border border-white/5 text-slate-300 disabled:opacity-40 disabled:pointer-events-none hover:scale-105 active:scale-95 transition-all"
        title="Previous sentence"
      >
        <SkipBack class="h-4 w-4" />
      </button>

      <!-- Play / Pause Toggle -->
      <button
        v-if="store.playbackState !== 'playing'"
        @click="handlePlay"
        :disabled="!store.hasChunks"
        class="p-3.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all"
        title="Play"
      >
        <Play class="h-5 w-5 fill-slate-950" />
      </button>
      
      <button
        v-else
        @click="handlePause"
        class="p-3.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all"
        title="Pause"
      >
        <Pause class="h-5 w-5 fill-slate-950" />
      </button>

      <!-- Stop -->
      <button
        @click="handleStop"
        :disabled="!store.hasChunks || store.playbackState === 'idle'"
        class="p-2 rounded-lg bg-slate-950/50 hover:bg-slate-800/80 border border-white/5 text-slate-300 disabled:opacity-40 disabled:pointer-events-none hover:scale-105 active:scale-95 transition-all"
        title="Stop"
      >
        <Square class="h-4 w-4 fill-slate-300" />
      </button>

      <!-- Skip Forwards -->
      <button
        @click="handleNext"
        :disabled="!store.hasChunks || store.currentChunkIndex === store.textChunks.length - 1"
        class="p-2 rounded-lg bg-slate-950/50 hover:bg-slate-800/80 border border-white/5 text-slate-300 disabled:opacity-40 disabled:pointer-events-none hover:scale-105 active:scale-95 transition-all"
        title="Next sentence"
      >
        <SkipForward class="h-4 w-4" />
      </button>
    </div>

    <!-- Chunk Status & Progress -->
    <div v-if="store.hasChunks" class="flex items-center justify-between text-[11px] text-slate-400 px-1">
      <span>Sentence {{ store.currentChunkIndex + 1 }} of {{ store.textChunks.length }}</span>
      <span class="text-amber-500/80 font-medium">
        {{ Math.round(((store.currentChunkIndex + 1) / store.textChunks.length) * 100) }}% complete
      </span>
    </div>
  </div>
</template>

<style scoped>
@keyframes barPulse {
  0%, 100% { height: 4px; }
  50% { height: 12px; }
}
.animate-\[barPulse_0\.6s_ease-in-out_infinite\] {
  animation: barPulse 0.6s ease-in-out infinite;
}
.animate-\[barPulse_0\.8s_ease-in-out_infinite_0\.15s\] {
  animation: barPulse 0.8s ease-in-out infinite 0.15s;
}
.animate-\[barPulse_0\.5s_ease-in-out_infinite_0\.3s\] {
  animation: barPulse 0.5s ease-in-out infinite 0.3s;
}
</style>
