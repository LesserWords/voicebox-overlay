import { usePlayerStore } from "../stores/playerStore";

/**
 * Checks if the application is currently running inside the Tauri shell container.
 */
export const isTauri = (): boolean => {
  return typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ !== undefined;
};

export function useSystemBridge() {
  const store = usePlayerStore();

  /**
   * Helper to safely read from the system clipboard.
   * If in Tauri, uses tauri-plugin-clipboard-manager.
   * If in browser, falls back to standard navigator.clipboard or dummy fallback text.
   */
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
    } else {
      try {
        if (navigator.clipboard) {
          return await navigator.clipboard.readText();
        }
      } catch (err) {
        console.warn("[System Bridge] Browser clipboard permission denied or not supported. Using default fallback text.");
      }
      return "This is a fallback text from your system clipboard. The voicebox overlay is running in standard browser mock mode. It has loaded your paragraph chunks successfully!";
    }
  };

  /**
   * Invokes native Rust commands to show the window.
   */
  const showWindow = async () => {
    if (isTauri()) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("show_window");
      } catch (err) {
        console.error("[System Bridge] Failed to invoke show_window:", err);
      }
    } else {
      console.log("[System Bridge] Mock Show Window triggered");
    }
  };

  /**
   * Invokes native Rust commands to hide the window.
   */
  const hideWindow = async () => {
    if (isTauri()) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("hide_window");
      } catch (err) {
        console.error("[System Bridge] Failed to invoke hide_window:", err);
      }
    } else {
      console.log("[System Bridge] Mock Hide Window triggered");
    }
  };

  /**
   * Co-ordinates the shortcut action:
   * 1. Read clipboard
   * 2. Populate store and split into sentences
   * 3. Show window
   * 4. Trigger audio streaming
   */
  const handleShortcutTriggered = async () => {
    console.log("[System Bridge] Hotkey event received!");
    const text = await readClipboardText();
    if (text) {
      store.loadText(text);
      await showWindow();
      store.play();
    }
  };

  /**
   * Initializes listeners.
   * Registers Tauri event bindings or fallback browser hotkeys.
   */
  const initListeners = async () => {
    if (isTauri()) {
      try {
        const { listen } = await import("@tauri-apps/api/event");
        const { getCurrentWindow } = await import("@tauri-apps/api/window");

        // 1. Listen for shortcut triggered event from Rust backend
        await listen("shortcut-triggered", () => {
          handleShortcutTriggered();
        });

        // 2. Listen for window blur (focus loss) to auto-hide the overlay
        const appWindow = getCurrentWindow();
        await appWindow.listen("tauri://blur", () => {
          console.log("[System Bridge] Window lost focus, hiding window...");
          hideWindow();
        });

        console.log("[System Bridge] Tauri system listeners registered successfully.");
      } catch (err) {
        console.error("[System Bridge] Failed to initialize Tauri event listeners:", err);
      }
    } else {
      // Browser fallback hotkey: Alt + Shift + Space
      window.addEventListener("keydown", (e) => {
        if (e.altKey && e.shiftKey && e.code === "Space") {
          e.preventDefault();
          handleShortcutTriggered();
        }
      });
      console.log("[System Bridge] Browser fallback keyboard listener registered: Alt+Shift+Space");
    }
  };

  return {
    initListeners,
    showWindow,
    hideWindow,
    readClipboardText,
  };
}
