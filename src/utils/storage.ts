/**
 * Safe localStorage wrapper that never throws in restricted/private/iframe environments.
 */
export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn(`safeStorage.getItem("${key}") failed:`, e);
    }
    return null;
  },

  setItem: (key: string, value: string): boolean => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return true;
      }
    } catch (e) {
      console.warn(`safeStorage.setItem("${key}") failed:`, e);
    }
    return false;
  },

  removeItem: (key: string): boolean => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return true;
      }
    } catch (e) {
      console.warn(`safeStorage.removeItem("${key}") failed:`, e);
    }
    return false;
  },
};
