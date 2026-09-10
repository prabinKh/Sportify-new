/* eslint-disable @typescript-eslint/no-explicit-any */
export const setLocalStorageWithExpiry = (
  key: string,
  value: any,
  ttl: number = 1000 * 60 * 60
) => {
  try {
    const now = new Date();
    const item = {
      value: value,
      expiry: now.getTime() + ttl,
    };
    localStorage.setItem(key, JSON.stringify(item));
  } catch {
    // localStorage might be disabled or full
  }
};

export const getFromLocalStorageWithExpiry = (key: string): any => {
  try {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) {
      return null;
    }
    try {
      const item = JSON.parse(itemStr);
      if (item && typeof item === 'object' && 'expiry' in item) {
        const now = new Date();
        if (now.getTime() > item.expiry) {
          localStorage.removeItem(key);
          return null;
        }
        return item.value;
      }
      return item;
    } catch {
      // If it's a plain string (like access token), safely return it
      return itemStr;
    }
  } catch {
    return null;
  }
};
