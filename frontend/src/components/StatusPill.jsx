const MAP = {
  PENDING: ["Pending", "bg-ochre/15 text-ochre"],
  ACCEPTED: ["Accepted", "bg-pine/15 text-pine"],
  REJECTED: ["Declined", "bg-brick/15 text-brick"],
};

export default function StatusPill({ status }) {
  const [label, cls] = MAP[status] || [status, "bg-rule text-slate2"];
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}
