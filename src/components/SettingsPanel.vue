<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { X, Save, Keyboard, Server, Cpu } from "@lucide/vue";
import { useSystemBridge } from "../composables/useSystemBridge";
import { listProviders } from "../providers";
import { DEFAULT_CONFIG, type AppConfig } from "../stores/playerStore";

const emit = defineEmits<{ (e: "close"): void }>();

const { getConfig, setConfig } = useSystemBridge();

const shortcut = ref("");
const provider = ref("");
const apiUrl = ref("");
const original = ref<AppConfig>({ ...DEFAULT_CONFIG });
const status = ref<{ type: "ok" | "err"; msg: string } | null>(null);
const saving = ref(false);

const providers = listProviders();

const dirty = computed(
  () =>
    shortcut.value.trim() !== original.value.shortcut ||
    provider.value !== original.value.provider ||
    apiUrl.value.trim() !== original.value.api_url
);

const showApiUrl = computed(() => {
  // Only show URL field for non-local providers
  return providers.find((p) => p.id === provider.value)?.id !== "mock";
});

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

const resetDefaults = () => {
  shortcut.value = DEFAULT_CONFIG.shortcut;
  provider.value = DEFAULT_CONFIG.provider;
  apiUrl.value = DEFAULT_CONFIG.api_url;
};
</script>

<template>
  <div class="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
    <div class="w-full max-w-sm bg-slate-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col my-4">
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
            Modular adapters. All implement the same <code>AudioProvider</code> interface
            (<code>fetchProfiles</code>, <code>generateAudio</code>, <code>isAvailable</code>).
          </p>
        </label>

        <!-- API URL (hidden for local providers like mock) -->
        <label v-if="showApiUrl" class="block">
          <span class="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center space-x-1.5">
            <Server class="h-3 w-3" />
            <span>API Base URL</span>
          </span>
          <input
            v-model="apiUrl"
            type="text"
            spellcheck="false"
            placeholder="http://localhost:17493"
            class="mt-1 w-full bg-slate-950/70 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500/40 font-mono"
          />
          <p class="mt-1 text-[10px] text-slate-500">
            HTTP endpoint for the selected provider. Expected routes: <code>GET /api/profiles</code>, <code>POST /api/generate</code>.
          </p>
        </label>

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
