import { API_URL } from "../config";

// One colour per subject, used for generated covers and the subject filter dots.
export const SPINE_COLORS = ["#8E2F3C", "#1F5C4A", "#25407F", "#B07A12", "#5B3A70", "#17727B", "#3E4756"];

export function subjectColor(subject) {
  const key = (subject || "general").trim().toLowerCase();
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return SPINE_COLORS[h % SPINE_COLORS.length];
}

const SIZES = {
  sm: { pad: "p-1", title: "text-lg", meta: "text-[8px]" },
  md: { pad: "p-4", title: "text-base leading-snug", meta: "text-xs" },
  lg: { pad: "p-6", title: "text-2xl leading-snug", meta: "text-sm" },
};

/**
 * Book cover. Uses the uploaded photo when there is one; otherwise it typesets
 * a cover from the title, author and course in the subject's colour.
 * `src` overrides the image (used for the live preview while uploading).
 */
export default function BookCover({ book, size = "md", src, className = "" }) {
  const s = SIZES[size];
  const color = subjectColor(book.subject);
  const imageSrc = src || (book.imageUrl ? `${API_URL}${book.imageUrl}` : null);

  return (
    <div
      className={`relative aspect-[3/4] w-full overflow-hidden rounded-l-[3px] rounded-r-md ${className}`}
      style={{ backgroundColor: color }}
    >
      {imageSrc ? (
        <img src={imageSrc} alt={`Cover of ${book.title}`} className="h-full w-full object-cover" loading="lazy" />
      ) : size === "sm" ? (
        <div className={`grid h-full place-items-center font-serif font-semibold text-white ${s.title}`}>
          {(book.title || "?").trim().charAt(0).toUpperCase()}
        </div>
      ) : (
        <div className={`flex h-full flex-col justify-between text-white ${s.pad}`}>
          <span className={`${s.meta} line-clamp-1 pl-[10%] opacity-80`}>{book.course || book.subject || ""}</span>
          <div className="pl-[10%]">
            <p className={`line-clamp-4 font-serif font-semibold ${s.title}`}>{book.title}</p>
            {book.author && <p className={`mt-2 line-clamp-1 opacity-80 ${s.meta}`}>{book.author}</p>}
          </div>
        </div>
      )}
      {/* spine shading */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-[12%]"
        style={{ background: "linear-gradient(90deg, rgba(0,0,0,.28), rgba(255,255,255,.14) 55%, transparent)" }}
      />
    </div>
  );
}
