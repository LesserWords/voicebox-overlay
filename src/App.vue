<script setup lang="ts">
import { onMounted } from "vue";
import FloatingWidget from "./components/FloatingWidget.vue";
import { useSystemBridge, isTauri } from "./composables/useSystemBridge";
import { setActiveProvider, getActiveProvider } from "./providers";
import { usePlayerStore } from "./stores/playerStore";

const store = usePlayerStore();
const { initListeners, getConfig } = useSystemBridge();

async function reloadProvider() {
  const cfg = store.config;
  const provider = setActiveProvider(cfg.provider, { apiUrl: cfg.api_url });
  try {
    const healthy = await provider.isAvailable();
    store.setProviderHealthy(healthy);
    if (healthy) {
      const profiles = await provider.fetchProfiles();
      store.setAvailableProfiles(profiles);
      store.clearError();
    } else {
      store.setAvailableProfiles([]);
      store.setError(`Provider "${provider.name}" unreachable. Open Settings to configure.`);
    }
  } catch (err) {
    console.error("Provider init failed:", err);
    store.setProviderHealthy(false);
    store.setAvailableProfiles([]);
    store.setError(`Provider "${provider.name}" failed: ${(err as any)?.message ?? err}`);
  }
}

onMounted(async () => {
  await initListeners();

  // Load persisted config from Rust, then initialize provider
  const cfg = await getConfig();
  store.setConfig(cfg);
  await reloadProvider();

  // React to live config updates emitted by Rust set_config
  if (isTauri()) {
    const { listen } = await import("@tauri-apps/api/event");
    await listen("config-updated", async (event) => {
      store.setConfig(event.payload as any);
      await reloadProvider();
    });
  }

  // Touch the active provider once so the lazy default never lingers
  getActiveProvider();
});
</script>

<template>
  <main class="min-h-screen bg-transparent text-slate-100 flex items-center justify-center p-4 font-sans select-none overflow-hidden">
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
