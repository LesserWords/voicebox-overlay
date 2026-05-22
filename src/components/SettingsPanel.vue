<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { X, Save, Keyboard, Server, Cpu, RefreshCw, CheckCircle2, XCircle } from "@lucide/vue";
import { useSystemBridge } from "../composables/useSystemBridge";
import { useProvider } from "../composables/useProvider";
import { listProviders } from "../providers";
import { DEFAULT_CONFIG, type AppConfig, usePlayerStore } from "../stores/playerStore";

const emit = defineEmits<{ (e: "close"): void }>();

const { getConfig, setConfig } = useSystemBridge();
const { refresh } = useProvider();
const store = usePlayerStore();

const shortcut = ref("");
const provider = ref("");
const apiUrl = ref("");
const original = ref<AppConfig>({ ...DEFAULT_CONFIG });
const status = ref<{ type: "ok" | "err"; msg: string } | null>(null);
const saving = ref(false);
const testing = ref(false);

const providers = listProviders();

const dirty = computed(
  () =>
    shortcut.value.trim() !== original.value.shortcut ||
    provider.value !== original.value.provider ||
    apiUrl.value.trim() !== original.value.api_url
);

const showApiUrl = computed(() => provider.value !== "mock");

onMounted(async () => {
  const cfg = await getConfig();
  shortcut.value = cfg.shortcut;
  provider.value = cfg.provider;
  apiUrl.value = cfg.api_url;
  original.value = cfg;
});

const save = async () => {
  status.value = null;
  saving.value = true;
  try {
    const next: AppConfig = {
      shortcut: shortcut.value.trim(),
      provider: provider.value,
      api_url: apiUrl.value.trim(),
    };
    const saved = await setConfig(next);
    original.value = saved;
    status.value = { type: "ok", msg: "Settings saved." };
  } catch (err: any) {
    status.value = { type: "err", msg: String(err?.message ?? err) };
  } finally {
    saving.value = false;
  }
};

const testConnection = async () => {
  status.value = null;
  testing.value = true;
  try {
    // Apply current edits transiently so the probe uses what's on screen,
    // without persisting if the user just wants to verify.
    const previousCfg = { ...store.config };
    store.setConfig({
      shortcut: shortcut.value.trim() || previousCfg.shortcut,
      provider: provider.value,
      api_url: apiUrl.value.trim(),
    });
    const result = await refresh();
    // Restore persisted config — user must press Save to commit.
    store.setConfig(previousCfg);
    if (result.healthy) {
      status.value = { type: "ok", msg: `Connection OK. ${store.availableProfiles.length} profile(s) loaded.` };
    } else {
      status.value = { type: "err", msg: result.error ?? "Provider unreachable." };
    }
  } catch (err: any) {
    status.value = { type: "err", msg: String(err?.message ?? err) };
  } finally {
    testing.value = false;
  }
};

const resetDefaults = () => {
  shortcut.value = DEFAULT_CONFIG.shortcut;
  provider.value = DEFAULT_CONFIG.provider;
  apiUrl.value = DEFAULT_CONFIG.api_url;
};
</script>

<template>
  <div class="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-start justify-center p-3 overflow-y-auto">
    <div class="w-full max-w-sm bg-slate-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col my-2">
      <header class="h-12 px-4 flex items-center justify-between border-b border-white/5 shrink-0">
        <div class="flex items-center space-x-2">
          <Keyboard class="h-4 w-4 text-amber-400" />
          <span class="text-xs font-bold uppercase tracking-wider text-slate-200">Settings</span>
        </div>
        <button
          @click="emit('close')"
          class="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 active:scale-95 transition-all"
          title="Close"
        >
          <X class="h-4 w-4" />
        </button>
      </header>

      <div class="p-4 space-y-4">
        <!-- Audio Source Provider -->
        <label class="block">
          <span class="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center space-x-1.5">
            <Cpu class="h-3 w-3" />
            <span>Audio Source</span>
          </span>
          <select
            v-model="provider"
            class="mt-1 w-full bg-slate-950/70 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
          >
            <option v-for="p in providers" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
          <p class="mt-1 text-[10px] text-slate-500">
            Pluggable adapters. All implement the same <code>AudioProvider</code> interface.
          </p>
        </label>

        <!-- API URL + Test Connection -->
        <div v-if="showApiUrl" class="space-y-1">
          <div class="flex items-center justify-between">
            <span class="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center space-x-1.5">
              <Server class="h-3 w-3" />
              <span>API Base URL</span>
            </span>
            <div class="flex items-center space-x-1">
              <CheckCircle2 v-if="store.providerHealthy" class="h-3 w-3 text-emerald-400" />
              <XCircle v-else class="h-3 w-3 text-red-400" />
              <span
                class="text-[10px] uppercase tracking-wider font-semibold"
                :class="store.providerHealthy ? 'text-emerald-400' : 'text-red-400'"
              >
                {{ store.providerHealthy ? "Reachable" : "Unreachable" }}
              </span>
            </div>
          </div>
          <input
            v-model="apiUrl"
            type="text"
            spellcheck="false"
            placeholder="http://127.0.0.1:17493"
            class="w-full bg-slate-950/70 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500/40 font-mono"
          />
          <div class="flex items-center justify-between pt-0.5">
            <p class="text-[10px] text-slate-500 leading-relaxed">
              Routes: <code>GET /health</code>, <code>GET /profiles</code>, <code>POST /generate/stream</code>.
            </p>
            <button
              @click="testConnection"
              :disabled="testing || apiUrl.trim() === ''"
              class="shrink-0 ml-2 flex items-center space-x-1 px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-white/10 text-[10px] font-semibold text-slate-200 uppercase tracking-wider"
              title="Probe /health and reload profiles using the URL above (does not save)"
            >
              <RefreshCw class="h-3 w-3" :class="testing ? 'animate-spin' : ''" />
              <span>{{ testing ? "Testing..." : "Test" }}</span>
            </button>
          </div>
        </div>

        <!-- Global Shortcut -->
        <label class="block">
          <span class="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center space-x-1.5">
            <Keyboard class="h-3 w-3" />
            <span>Global Shortcut</span>
          </span>
          <input
            v-model="shortcut"
            type="text"
            spellcheck="false"
            placeholder="alt+shift+space"
            class="mt-1 w-full bg-slate-950/70 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500/40 font-mono"
          />
          <p class="mt-1 text-[10px] text-slate-500 leading-relaxed">
            Modifiers: <code>ctrl</code>, <code>alt</code>, <code>shift</code>, <code>super</code>.
            Avoid <code>super+shift+space</code> (reserved by Windows IME).
          </p>
        </label>

        <div
          v-if="status"
          :class="status.type === 'ok' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-red-300 bg-red-500/10 border-red-500/20'"
          class="text-[11px] px-3 py-2 rounded-lg border"
        >
          {{ status.msg }}
        </div>

        <div class="flex items-center justify-between pt-1">
          <button
            @click="resetDefaults"
            class="text-[11px] text-slate-400 hover:text-slate-200 underline-offset-2 hover:underline"
          >
            Reset to defaults
          </button>
          <button
            @click="save"
            :disabled="saving || !dirty || shortcut.trim() === ''"
            class="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors shadow-md shadow-amber-500/10"
          >
            <Save class="h-3.5 w-3.5" />
            <span>{{ saving ? "Saving..." : "Save" }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
