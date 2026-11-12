import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const DialogContext = createContext(null);

// Confirmation pop-ups and toast messages for the whole app.
//   const { confirm, toast } = useDialog();
//   if (await confirm({ title, message, confirmText, tone: "danger" })) { ... }
//   toast("Saved!")  /  toast("Something failed", "error")
export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null); // { title, message, confirmText, cancelText, tone, resolve }
  const [toasts, setToasts] = useState([]);
  const confirmButtonRef = useRef(null);

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        setDialog({ confirmText: "Confirm", cancelText: "Cancel", tone: "primary", ...options, resolve });
      }),
    []
  );

  // One-button notice (e.g. "logged in on another device"); resolves when dismissed
  const alert = useCallback(
    (options) =>
      new Promise((resolve) => {
        setDialog({ confirmText: "OK", tone: "primary", ...options, single: true, resolve });
      }),
    []
  );

  const close = (result) => {
    dialog?.resolve(result);
    setDialog(null);
  };

  const toast = useCallback((text, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list, { id, text, type }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 4000);
  }, []);

  // Escape cancels, focus starts on the confirm button
  useEffect(() => {
    if (!dialog) return;
    confirmButtonRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && close(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialog]);

  return (
    <DialogContext.Provider value={{ confirm, alert, toast }}>
      {children}

      {dialog && (
        <div className="modal-backdrop" onMouseDown={() => close(false)}>
          <div
            className="modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className={`modal-icon modal-icon-${dialog.tone}`}>
              {dialog.tone === "danger" ? "!" : dialog.single ? "i" : "?"}
            </div>
            <h3 id="modal-title">{dialog.title}</h3>
            {dialog.message && <p>{dialog.message}</p>}
            <div className="modal-actions">
              {!dialog.single && (
                <button type="button" className="btn-ghost" onClick={() => close(false)}>
                  {dialog.cancelText}
                </button>
              )}
              <button
                type="button"
                ref={confirmButtonRef}
                className={dialog.tone === "danger" ? "btn-danger" : ""}
                onClick={() => close(true)}
              >
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.text}
          </div>
        ))}
      </div>
    </DialogContext.Provider>
  );
}

export function useDialog() {
  return useContext(DialogContext);
}
