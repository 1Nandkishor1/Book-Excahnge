import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

const DOT = { success: "bg-emerald-400", error: "bg-red-400", info: "bg-white/60" };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback(
    (message, opts = {}) => {
      const id = ++idRef.current;
      setToasts((t) => [...t, { id, message, tone: opts.tone || "info", action: opts.action }]);
      setTimeout(() => dismiss(id), opts.duration ?? 4000);
      return id;
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      show: push,
      success: (m, o) => push(m, { ...o, tone: "success" }),
      error: (m, o) => push(m, { ...o, tone: "error", duration: 6000 }),
      dismiss,
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 left-1/2 z-50 flex w-full max-w-md -translate-x-1/2 flex-col items-center gap-2 px-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex animate-toast items-center gap-3 rounded-lg bg-ink px-4 py-2.5 text-sm text-white shadow-lg"
          >
            <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[t.tone]}`} />
            <span>{t.message}</span>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action.onClick();
                  dismiss(t.id);
                }}
                className="font-semibold text-violet-300 hover:text-violet-200"
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
