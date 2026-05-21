<script setup lang="ts">
import { onMounted } from "vue";
import FloatingWidget from "./components/FloatingWidget.vue";
import { useSystemBridge } from "./composables/useSystemBridge";
import { voiceboxClient } from "./api/voiceboxClient";
import { usePlayerStore } from "./stores/playerStore";

const store = usePlayerStore();
const { initListeners } = useSystemBridge();

onMounted(async () => {
  // Initialize Tauri event listeners or Browser fallback shortcuts
  await initListeners();
  
  // Load voice profiles from Voicebox API
  try {
    const profiles = await voiceboxClient.fetchProfiles();
    store.setAvailableProfiles(profiles);
  } catch (error) {
    console.error("Failed to load voice profiles:", error);
    store.setError("Could not load voice profiles");
  }
});
</script>

<template>
  <main class="min-h-screen bg-transparent text-slate-100 flex items-center justify-center p-4 font-sans select-none overflow-hidden">
    <!-- Main Floating Widget Container -->
    <FloatingWidget />
  </main>
</template>

<style>
/* Make the html and body elements transparent so the Tauri window is transparent */
html, body, #app {
  background: transparent !important;
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>