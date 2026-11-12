// Tells App.js when the API rejected our login token (see api.js), e.g. because
// this account was logged in on another device.
const listeners = new Set();

export const onSessionEnded = (callback) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};

export const emitSessionEnded = (detail) => listeners.forEach((callback) => callback(detail));
