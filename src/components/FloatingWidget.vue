<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from "vue";
import { GripHorizontal, X, Clipboard, Edit2, BookOpen, AlertCircle, Settings, Power, RefreshCw } from "@lucide/vue";
import { usePlayerStore } from "../stores/playerStore";
import { useSystemBridge, isTauri } from "../composables/useSystemBridge";
import { useAudioStream } from "../composables/useAudioStream";
import { useProvider } from "../composables/useProvider";
import AudioControls from "./AudioControls.vue";
import SettingsPanel from "./SettingsPanel.vue";

const store = usePlayerStore();
const { hideWindow, quitApp, readClipboardText } = useSystemBridge();
const { isLoading } = useAudioStream();
const { refresh: refreshProvider } = useProvider();
const isRefreshing = ref(false);

const doRefresh = async () => {
  if (isRefreshing.value) return;
  isRefreshing.value = true;
  try {
    await refreshProvider();
  } finally {
    isRefreshing.value = false;
  }
};

const isEditing = ref(false);
const localText = ref("");
const textContainerRef = ref<HTMLDivElement | null>(null);
const isSettingsOpen = ref(false);

let unlistenSettings: (() => void) | null = null;

onMounted(async () => {
  if (isTauri()) {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const win = getCurrentWindow();
    unlistenSettings = await win.listen("open-settings", () => {
      isSettingsOpen.value = true;
    });
  }
});

onUnmounted(() => {
  if (unlistenSettings) unlistenSettings();
});

// Trigger manual clipboard read
const pasteFromClipboard = async () => {
  const text = await readClipboardText();
  if (text && text.trim().length > 0) {
    store.loadText(text);
    localText.value = text;
    store.clearError();
  } else {
    store.setError("Clipboard is empty or unreadable.");
  }
};

// Toggle between reader and editor modes
const toggleEditMode = () => {
  if (isEditing.value) {
    // Save text changes
    store.loadText(localText.value);
  } else {
    // Open editor
    localText.value = store.rawText || "";
  }
  isEditing.value = !isEditing.value;
};

// Make sure active chunk auto-scrolls into center viewport
const scrollToActiveChunk = () => {
  nextTick(() => {
    const activeEl = textContainerRef.value?.querySelector(".active-speech-chunk");
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });
};

// Jump to a specific sentence when clicking on a reader span
const jumpToChunk = (index: number) => {
  store.currentChunkIndex = index;
  if (store.playbackState !== "playing") {
    store.play();
  }
};

// Watch chunk index changes to trigger scrolling
watch(() => store.currentChunkIndex, () => {
  scrollToActiveChunk();
});

// Watch when chunks are loaded to scroll to top
watch(() => store.textChunks, () => {
  nextTick(() => {
    if (textContainerRef.value) {
      textContainerRef.value.scrollTop = 0;
    }
  });
});
</script>

<template>
  <div class="glass-panel w-full h-full rounded-2xl overflow-hidden flex flex-col border border-white/10 select-none animate-slide-up text-slate-100 relative">
    <!-- Draggable Header Region -->
    <header 
      data-tauri-drag-region 
      class="h-14 bg-slate-950/80 border-b border-white/5 px-4 flex items-center justify-between cursor-move shrink-0"
    >
      <div class="flex items-center space-x-2" data-tauri-drag-region>
        <GripHorizontal class="h-4 w-4 text-slate-400 pointer-events-none" />
        <span class="text-xs font-bold uppercase tracking-wider text-slate-300 pointer-events-none">Voicebox Overlay</span>
        <span
          class="inline-block w-1.5 h-1.5 rounded-full pointer-events-none"
          :class="store.providerHealthy ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]' : 'bg-red-500'"
          :title="store.providerHealthy ? 'Audio source reachable' : 'Audio source unreachable'"
        ></span>
      </div>

      <!-- Header Controls -->
      <div class="flex items-center space-x-1.5">
        <!-- Edit/Reader Toggle -->
        <button
          @click="toggleEditMode"
          class="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 active:scale-95 transition-all"
          :title="isEditing ? 'Read Mode' : 'Edit Text'"
        >
          <BookOpen v-if="isEditing" class="h-4 w-4" />
          <Edit2 v-else class="h-4 w-4" />
        </button>

        <!-- Manual Clipboard Fetch -->
        <button
          @click="pasteFromClipboard"
          class="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 active:scale-95 transition-all"
          title="Paste from Clipboard"
        >
          <Clipboard class="h-4 w-4" />
        </button>

        <!-- Refresh / Reconnect Check -->
        <button
          @click="doRefresh"
          :disabled="isRefreshing"
          class="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 active:scale-95 transition-all disabled:opacity-50"
          title="Re-check audio source"
        >
          <RefreshCw class="h-4 w-4" :class="isRefreshing ? 'animate-spin' : ''" />
        </button>

        <!-- Settings -->
        <button
          @click="isSettingsOpen = true"
          class="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 active:scale-95 transition-all"
          title="Settings"
        >
          <Settings class="h-4 w-4" />
        </button>

        <!-- Hide (keeps process alive; reopen via tray or hotkey) -->
        <button
          @click="hideWindow"
          class="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 active:scale-95 transition-all"
          title="Hide Overlay (process keeps running in tray)"
        >
          <X class="h-4 w-4" />
        </button>

        <!-- Quit (kills background process) -->
        <button
          @click="quitApp"
          class="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 active:scale-95 transition-all"
          title="Quit (exit background process)"
        >
          <Power class="h-4 w-4" />
        </button>
      </div>
    </header>

    <!-- Error Banner -->
    <div
      v-if="store.errorMessage"
      class="bg-red-500/15 border-b border-red-500/25 px-4 py-2 flex items-center justify-between gap-2 text-xs text-red-300 shrink-0"
    >
      <div class="flex items-center space-x-2 min-w-0">
        <AlertCircle class="h-4 w-4 shrink-0 text-red-400" />
        <span class="truncate">{{ store.errorMessage }}</span>
      </div>
      <button
        v-if="!store.providerHealthy"
        @click="isSettingsOpen = true"
        class="shrink-0 px-2 py-0.5 rounded-md bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-[10px] font-semibold uppercase tracking-wider"
      >
        Configure
      </button>
    </div>

    <!-- Content Workspace -->
    <div class="flex-1 min-h-0 flex flex-col p-4 space-y-4">
      <!-- Edit Mode Container -->
      <div v-if="isEditing" class="flex-1 min-h-0 flex flex-col">
        <textarea
          v-model="localText"
          placeholder="Paste or type raw text here..."
          class="flex-1 w-full bg-slate-950/70 border border-white/10 rounded-xl p-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500/40 resize-none font-sans leading-relaxed"
        ></textarea>
        <button
          @click="toggleEditMode"
          class="mt-2 w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors shadow-md shadow-amber-500/10"
        >
          Save & Update Chunks
        </button>
      </div>

      <!-- Reader Mode Display -->
      <div 
        v-else 
        ref="textContainerRef"
        class="flex-1 min-h-0 overflow-y-auto bg-slate-950/40 border border-white/5 rounded-xl p-4 space-y-3 scroll-smooth"
      >
        <!-- Empty State -->
        <div 
          v-if="!store.hasChunks" 
          class="h-full flex flex-col items-center justify-center text-center space-y-3 px-4 text-slate-400"
        >
          <Clipboard class="h-10 w-10 text-slate-600 animate-pulse-slow" />
          <div class="space-y-1">
            <p class="text-sm font-semibold text-slate-300">No content loaded</p>
            <p class="text-[11px] leading-normal text-slate-500">
              Copy any text to clipboard and press <kbd class="px-1.5 py-0.5 bg-slate-900 border border-white/10 rounded text-[10px]">Alt + Shift + Space</kbd> or click clipboard button above.
            </p>
          </div>
          <button
            @click="pasteFromClipboard"
            class="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-medium text-slate-200 rounded-lg transition-all active:scale-95"
          >
            Paste Text Now
          </button>
        </div>

        <!-- Render Segments -->
        <div v-else class="text-sm leading-relaxed text-slate-300 space-y-2 select-text">
          <span
            v-for="(chunk, idx) in store.textChunks"
            :key="idx"
            @click="jumpToChunk(idx)"
            class="cursor-pointer px-1 rounded transition-all duration-200 block border-l border-transparent hover:bg-white/5 hover:text-white"
            :class="{ 'active-speech-chunk font-medium': idx === store.currentChunkIndex && store.playbackState !== 'idle' }"
          >
            {{ chunk }}
          </span>
        </div>
      </div>

      <!-- Streaming Loading State overlay -->
      <div v-if="isLoading" class="flex items-center justify-center space-x-2 py-1 text-xs text-amber-400/80 animate-pulse">
        <span class="inline-block w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping"></span>
        <span>Synthesizing voice...</span>
      </div>

      <!-- Controls Panel Footer -->
      <AudioControls class="shrink-0" />
    </div>

    <!-- Settings Overlay -->
    <SettingsPanel v-if="isSettingsOpen" @close="isSettingsOpen = false" />
  </div>
</template>

<style>
/* Custom style variables integration */
kbd {
  font-family: monospace;
}
</style>
