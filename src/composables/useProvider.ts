import { usePlayerStore } from "../stores/playerStore";
import { setActiveProvider, getActiveProvider } from "../providers";

export function useProvider() {
  const store = usePlayerStore();

  /**
   * Probe the configured provider and refresh profiles.
   * Used at startup, after config-updated, and from the Settings "Test connection" button.
   */
  async function refresh(): Promise<{ healthy: boolean; error?: string }> {
    const cfg = store.config;
    const provider = setActiveProvider(cfg.provider, { apiUrl: cfg.api_url });
    try {
      const healthy = await provider.isAvailable();
      store.setProviderHealthy(healthy);
      if (healthy) {
        const profiles = await provider.fetchProfiles();
        store.setAvailableProfiles(profiles);
        store.clearError();
        return { healthy: true };
      } else {
        store.setAvailableProfiles([]);
        const msg = `Provider "${provider.name}" unreachable. Open Settings to configure.`;
        store.setError(msg);
        return { healthy: false, error: msg };
      }
    } catch (err: any) {
      const msg = `Provider "${provider.name}" failed: ${err?.message ?? err}`;
      store.setProviderHealthy(false);
      store.setAvailableProfiles([]);
      store.setError(msg);
      return { healthy: false, error: msg };
    }
  }

  return { refresh, getActiveProvider };
}
