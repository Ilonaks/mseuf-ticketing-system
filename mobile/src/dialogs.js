// App-wide confirmation pop-ups and toasts, drawn by <DialogHost /> (mounted once in App.js).
//   if (await confirm({ title, message, confirmText, tone: "danger" })) { ... }
//   notify("Saved!")  /  notify("Something failed", "error")
//   await alert({ title, message })
let host = null;

export const registerDialogHost = (h) => {
  host = h;
};

export const confirm = (options) => (host ? host.confirm(options) : Promise.resolve(false));

export const notify = (text, type = "success") => host?.toast(text, type);

// One-button pop-up, e.g. "logged in on another device"
export const alert = (options) => (host ? host.alert(options) : Promise.resolve(true));
