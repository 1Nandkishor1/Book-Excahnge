import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { bookAPI } from "../services/api";
import BookCard from "../components/BookCard";
import EmptyState from "../components/EmptyState";
import { BookGridSkeleton } from "../components/Skeleton";
import { PlusIcon } from "../components/Icons";
import { useToast } from "../context/ToastContext";
import { errorMessage } from "../utils/errors";

export default function MyBooks() {
  const toast = useToast();
  const [books, setBooks] = useState([]);
  const [status, setStatus] = useState("loading");
  const pending = useRef(new Map()); // bookId -> timeout for deletes that can still be undone

  useEffect(() => {
    bookAPI
      .getMine()
      .then((res) => {
        setBooks(res.data.sort((a, b) => b.id - a.id));
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  // Leaving the page finishes any delete still waiting on its undo window
  useEffect(() => {
    const timers = pending.current;
    return () => {
      timers.forEach((entry, bookId) => {
        clearTimeout(entry);
        bookAPI.delete(bookId).catch(() => {});
      });
    };
  }, []);

  const toggleListed = async (book) => {
    const next = !book.available;
    setBooks((l) => l.map((b) => (b.id === book.id ? { ...b, available: next } : b)));
    try {
      await bookAPI.update(book.id, { ...book, available: next });
      toast.success(next ? "Listed again." : "Removed from browse.");
    } catch (err) {
      setBooks((l) => l.map((b) => (b.id === book.id ? { ...b, available: book.available } : b)));
      toast.error(errorMessage(err, "Couldn't update the listing."));
    }
  };

  // Delete is optimistic: the card disappears now, and the request runs after 5 seconds unless undone
  const remove = (book) => {
    setBooks((l) => l.filter((b) => b.id !== book.id));
    const timer = setTimeout(async () => {
      pending.current.delete(book.id);
      try {
        await bookAPI.delete(book.id);
      } catch (err) {
        setBooks((l) => [book, ...l].sort((a, b) => b.id - a.id));
        toast.error("Couldn't delete it. Listings that have offers can't be deleted. Remove it from browse instead.");
      }
    }, 5000);
    pending.current.set(book.id, timer);

    toast.show(`Deleted "${book.title}".`, {
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => {
          clearTimeout(pending.current.get(book.id));
          pending.current.delete(book.id);
          setBooks((l) => [book, ...l].sort((a, b) => b.id - a.id));
        },
      },
    });
  };

  if (status === "loading") return <BookGridSkeleton count={4} />;
  if (status === "error") {
    return <EmptyState title="Couldn't load your listings" body="Check that the backend is running, then refresh." />;
  }

  return (
    <div>
      <div className="mb-8 flex items-end justify-between gap-4">
        <h1 className="text-3xl font-semibold">My listings</h1>
        <Link to="/add-book" className="btn-primary"><PlusIcon width={16} height={16} /> List a book</Link>
      </div>

      {books.length === 0 ? (
        <EmptyState
          title="You haven't listed any books"
          body="Pick a book from last semester and list it in a minute."
          action={<Link to="/add-book" className="btn-primary">List a book</Link>}
        />
      ) : (
        <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {books.map((book) => (
            <BookCard key={book.id} book={book} dimmed={!book.available}>
              <div className="mt-3 flex items-center justify-between border-t border-rule pt-3 text-sm">
                <label className="flex items-center gap-2">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={book.available}
                    aria-label={`Listed on browse: ${book.title}`}
                    onClick={() => toggleListed(book)}
                    className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${book.available ? "bg-stamp" : "bg-rule"}`}
                  >
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${book.available ? "left-[18px]" : "left-0.5"}`} />
                  </button>
                  <span className="text-slate2">Listed</span>
                </label>
                <div className="flex gap-3">
                  <Link to={`/edit-book/${book.id}`} className="font-medium text-stamp hover:underline">Edit</Link>
                  <button type="button" onClick={() => remove(book)} className="font-medium text-brick hover:underline">Delete</button>
                </div>
              </div>
            </BookCard>
          ))}
        </div>
      )}
    </div>
  );
}
