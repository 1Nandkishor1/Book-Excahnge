export default function EmptyState({ title, body, action }) {
  return (
    <div className="mx-auto max-w-sm py-16 text-center">
      <h2 className="text-xl font-semibold">{title}</h2>
      {body && <p className="mt-2 text-slate2">{body}</p>}
      {action && <div className="mt-5 flex justify-center gap-2">{action}</div>}
    </div>
  );
}
