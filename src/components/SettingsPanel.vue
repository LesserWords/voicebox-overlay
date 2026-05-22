<script setup lang="ts">
import { onMounted, ref } from "vue";
import { X, Save, Keyboard } from "@lucide/vue";
import { useSystemBridge } from "../composables/useSystemBridge";

const emit = defineEmits<{ (e: "close"): void }>();

const { getShortcut, setShortcut } = useSystemBridge();

const shortcut = ref("");
const original = ref("");
const status = ref<{ type: "ok" | "err"; msg: string } | null>(null);
const saving = ref(false);

onMounted(async () => {
  const current = await getShortcut();
  shortcut.value = current;
  original.value = current;
});

const save = async () => {
  status.value = null;
  saving.value = true;
  try {
    await setShortcut(shortcut.value.trim());
    original.value = shortcut.value.trim();
    status.value = { type: "ok", msg: "Shortcut updated." };
  } catch (err: any) {
    status.value = { type: "err", msg: String(err?.message ?? err) };
  } finally {
    saving.value = false;
  }
};

const reset = () => {
  shortcut.value = "alt+shift+space";
};
</script>

<template>
  <div class="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="w-full max-w-sm bg-slate-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col">
      <header class="h-12 px-4 flex items-center justify-between border-b border-white/5">
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

      <div class="p-4 space-y-3">
        <label class="block">
          <span class="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Global Shortcut</span>
          <input
            v-model="shortcut"
            type="text"
            spellcheck="false"
            placeholder="alt+shift+space"
            class="mt-1 w-full bg-slate-950/70 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500/40 font-mono"
          />
          <p class="mt-1.5 text-[10px] text-slate-500 leading-relaxed">
            Modifiers: <code>ctrl</code>, <code>alt</code>, <code>shift</code>, <code>super</code>. Example: <code>ctrl+alt+v</code>.
            Avoid <code>super+shift+space</code> (reserved by Windows).
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
            @click="reset"
            class="text-[11px] text-slate-400 hover:text-slate-200 underline-offset-2 hover:underline"
          >
            Reset to default
          </button>
          <button
            @click="save"
            :disabled="saving || shortcut.trim() === '' || shortcut.trim() === original"
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
