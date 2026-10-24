export default function Segmented({ options, value, onChange, label, className = "" }) {
  return (
    <div role="radiogroup" aria-label={label} className={`inline-flex rounded-lg border border-rule bg-white p-0.5 ${className}`}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 ${
              active ? "bg-stamp text-white" : "text-slate2 hover:text-ink"
            }`}
          >
            {o.label}
            {o.count != null && (
              <span className={`ml-1.5 text-xs ${active ? "text-white/75" : "text-slate2"}`}>{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
