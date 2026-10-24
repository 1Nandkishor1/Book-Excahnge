import { Link } from "react-router-dom";
import BookCover from "./BookCover";
import { HeartIcon } from "./Icons";

export default function BookCard({ book, saved, onToggleSave, dimmed = false, children }) {
  return (
    <article className="relative">
      <Link to={`/books/${book.id}`} className={`block rounded-md ${dimmed ? "opacity-55" : ""}`}>
        <BookCover book={book} />
        <h3 className="mt-3 line-clamp-2 text-[15px] font-semibold leading-snug">{book.title}</h3>
        <p className="mt-0.5 line-clamp-1 text-sm text-slate2">{book.author || "Author not listed"}</p>
      </Link>

      <div className="mt-2 flex items-center justify-between text-sm">
        {book.type === "SELL" ? (
          <span className="font-semibold">₹{book.price}</span>
        ) : (
          <span className="font-semibold text-stamp">Swap</span>
        )}
        {book.condition && <span className="text-slate2">{book.condition}</span>}
      </div>

      {onToggleSave && (
        <button
          type="button"
          onClick={() => onToggleSave(book.id)}
          aria-pressed={saved}
          aria-label={saved ? `Remove ${book.title} from saved` : `Save ${book.title}`}
          className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-ink backdrop-blur hover:bg-white"
        >
          <HeartIcon
            key={saved ? "on" : "off"}
            filled={saved}
            width={16}
            height={16}
            className={saved ? "animate-pop text-brick" : ""}
          />
        </button>
      )}
      {children}
    </article>
  );
}
