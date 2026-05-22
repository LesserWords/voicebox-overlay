import { usePlayerStore, type AppConfig, DEFAULT_CONFIG } from "../stores/playerStore";

export const isTauri = (): boolean => {
  return typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ !== undefined;
};

export function useSystemBridge() {
  const store = usePlayerStore();

  const readClipboardText = async (): Promise<string> => {
    if (isTauri()) {
      try {
        const { readText } = await import("@tauri-apps/plugin-clipboard-manager");
        const text = await readText();
        return text || "";
      } catch (err) {
        console.error("[System Bridge] Failed to read Tauri clipboard:", err);
        return "";
      }
    }
    try {
      if (navigator.clipboard) return await navigator.clipboard.readText();
    } catch {
      console.warn("[System Bridge] Browser clipboard denied. Using fallback text.");
    }
    return "This is fallback text from your system clipboard. The voicebox overlay is in browser mock mode.";
  };

  const showWindow = async () => {
    if (!isTauri()) return;
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("show_window");
    } catch (err) {
      console.error("[System Bridge] show_window failed:", err);
    }
  };

  const hideWindow = async () => {
    if (!isTauri()) return;
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("hide_window");
    } catch (err) {
      console.error("[System Bridge] hide_window failed:", err);
    }
  };

  const quitApp = async () => {
    if (!isTauri()) return;
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("quit_app");
    } catch (err) {
      console.error("[System Bridge] quit_app failed:", err);
    }
  };

  const getConfig = async (): Promise<AppConfig> => {
    if (!isTauri()) return { ...DEFAULT_CONFIG };
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke<AppConfig>("get_config");
    } catch (err) {
      console.error("[System Bridge] get_config failed:", err);
      return { ...DEFAULT_CONFIG };
    }
  };

  const setConfig = async (config: AppConfig): Promise<AppConfig> => {
    if (!isTauri()) return config;
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<AppConfig>("set_config", { config });
  };

  const handleShortcutTriggered = async () => {
    const text = await readClipboardText();
    if (!text) return;
    store.loadText(text);
    await showWindow();
    store.play();
  };

  const initListeners = async () => {
    if (isTauri()) {
      try {
        const { listen } = await import("@tauri-apps/api/event");
        await listen("shortcut-triggered", () => handleShortcutTriggered());
        // NOTE: tauri://blur auto-hide removed — widget now stays on screen
        // until user explicitly closes it (X = hide, tray Quit = exit process).
        console.log("[System Bridge] Tauri listeners registered.");
      } catch (err) {
        console.error("[System Bridge] init listeners failed:", err);
      }
    } else {
      window.addEventListener("keydown", (e) => {
        if (e.altKey && e.shiftKey && e.code === "Space") {
          e.preventDefault();
          handleShortcutTriggered();
        }
      });
    }
  };

  return {
    initListeners,
    showWindow,
    hideWindow,
    quitApp,
    readClipboardText,
    getConfig,
    setConfig,
  };
}
