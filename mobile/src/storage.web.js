// Token storage for web: expo-secure-store has no web implementation,
// so fall back to localStorage.
export const getItem = async (key) => localStorage.getItem(key);
export const setItem = async (key, value) => localStorage.setItem(key, value);
export const deleteItem = async (key) => localStorage.removeItem(key);
