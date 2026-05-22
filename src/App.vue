<script setup lang="ts">
import { onMounted } from "vue";
import FloatingWidget from "./components/FloatingWidget.vue";
import { useSystemBridge, isTauri } from "./composables/useSystemBridge";
import { useProvider } from "./composables/useProvider";
import { usePlayerStore } from "./stores/playerStore";

const store = usePlayerStore();
const { initListeners, getConfig } = useSystemBridge();
const { refresh } = useProvider();

onMounted(async () => {
  await initListeners();

  const cfg = await getConfig();
  store.setConfig(cfg);
  await refresh();

  if (isTauri()) {
    const { listen } = await import("@tauri-apps/api/event");
    await listen("config-updated", async (event) => {
      store.setConfig(event.payload as any);
      await refresh();
    });
  }
});
</script>

<template>
  <main class="w-full h-full bg-transparent text-slate-100 font-sans select-none overflow-hidden">
    <FloatingWidget />
  </main>
</template>

<style>
html, body, #app {
  background: transparent !important;
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
