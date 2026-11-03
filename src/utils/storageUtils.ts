/**
 * Safe LocalStorage Utilities for Stagger / StageNode
 * Prevents WebKit SecurityError and QuotaExceededError crashes from halting the app.
 */

export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (_) {
    return null;
  }
}

export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (_) {
    return false;
  }
}

export function safeRemoveItem(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (_) {
    return false;
  }
}

export function safeGetJson<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item) as T;
  } catch (_) {
    return fallback;
  }
}

export function clearWorkspaceCache(): void {
  safeRemoveItem("sn_workspaces");
  safeRemoveItem("sn_current_repo");
}

export function clearAllAppPreferences(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith("sn_") || k.startsWith("stagenode_"))) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch (_) {}
}
