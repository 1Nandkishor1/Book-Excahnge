import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { bookAPI } from "../services/api";
import BookCard from "../components/BookCard";
import Segmented from "../components/Segmented";
import EmptyState from "../components/EmptyState";
import { BookGridSkeleton } from "../components/Skeleton";
import { subjectColor } from "../components/BookCover";
import useSavedBooks from "../hooks/useSavedBooks";
import { SearchIcon, XIcon, HeartIcon } from "../components/Icons";

export default function Home() {
  const [books, setBooks] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [params, setParams] = useSearchParams();
  const { saved, toggle, isSaved } = useSavedBooks();
  const searchRef = useRef(null);

  // Filters live in the URL, so a filtered view can be shared or bookmarked
  const q = params.get("q") || "";
  const type = params.get("type") || "ALL";
  const subject = params.get("subject") || "";
  const sort = params.get("sort") || "new";
  const onlySaved = params.get("saved") === "1";

  const setParam = (key, value, fallback = "") => {
    const next = new URLSearchParams(params);
    if (!value || value === fallback) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await bookAPI.getAll();
      setBooks(res.data);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Press "/" anywhere to jump to the search box
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(tag)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const subjects = useMemo(() => {
    const counts = new Map();
    books.forEach((b) => {
      const label = (b.subject || "").trim();
      if (!label) return;
      const key = label.toLowerCase();
      counts.set(key, { label: counts.get(key)?.label || label, n: (counts.get(key)?.n || 0) + 1 });
    });
    return [...counts.values()].sort((a, b) => b.n - a.n);
  }, [books]);

  const typeCounts = useMemo(
    () => ({
      ALL: books.length,
      SELL: books.filter((b) => b.type === "SELL").length,
      SWAP: books.filter((b) => b.type === "SWAP").length,
    }),
    [books]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = books.filter((b) => {
      if (type !== "ALL" && b.type !== type) return false;
      if (subject && (b.subject || "").toLowerCase() !== subject.toLowerCase()) return false;
      if (onlySaved && !saved.includes(b.id)) return false;
      if (!needle) return true;
      return [b.title, b.author, b.subject, b.course].some((f) => (f || "").toLowerCase().includes(needle));
    });
    if (sort === "low") return list.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    if (sort === "high") return list.sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
    return list.sort((a, b) => b.id - a.id);
  }, [books, q, type, subject, sort, onlySaved, saved]);

  const hasFilters = Boolean(q || type !== "ALL" || subject || onlySaved);
  const clearAll = () => setParams({}, { replace: true });

  return (
    <div>
      <section className="pb-8">
        <h1 className="max-w-xl text-4xl font-semibold leading-tight sm:text-5xl">Books your seniors are done with</h1>
        <p className="mt-3 max-w-lg text-slate2">
          Buy, swap, or make an offer, then chat with the seller to settle a meetup on campus.
        </p>

        <div className="relative mt-6 max-w-2xl">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate2" />
          <input
            ref={searchRef}
            type="text"
            value={q}
            onChange={(e) => setParam("q", e.target.value)}
            placeholder="Search by title, author, subject or course"
            aria-label="Search books"
            className="field py-3 pl-10 pr-12 text-base"
          />
          {q ? (
            <button
              type="button"
              onClick={() => {
                setParam("q", "");
                searchRef.current?.focus();
              }}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-slate2 hover:text-ink"
            >
              <XIcon width={16} height={16} />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-rule px-1.5 text-xs text-slate2 sm:block">
              /
            </kbd>
          )}
        </div>
      </section>

      {status === "ready" && books.length > 0 && (
        <div className="space-y-4 pb-6">
          <div className="flex flex-wrap items-center gap-3">
            <Segmented
              label="Listing type"
              value={type}
              onChange={(v) => setParam("type", v, "ALL")}
              options={[
                { value: "ALL", label: "All", count: typeCounts.ALL },
                { value: "SELL", label: "For sale", count: typeCounts.SELL },
                { value: "SWAP", label: "Swap", count: typeCounts.SWAP },
              ]}
            />
            <button
              type="button"
              aria-pressed={onlySaved}
              onClick={() => setParam("saved", onlySaved ? "" : "1")}
              className={`btn border ${onlySaved ? "border-stamp bg-stamp-soft text-stamp-dark" : "border-rule bg-white text-ink hover:bg-paper"}`}
            >
              <HeartIcon filled={onlySaved} width={15} height={15} />
              Saved
              <span className="text-slate2">{saved.length}</span>
            </button>
            <label className="ml-auto flex items-center gap-2 text-sm text-slate2">
              Sort by
              <select
                value={sort}
                onChange={(e) => setParam("sort", e.target.value, "new")}
                className="field w-auto py-1.5"
              >
                <option value="new">Newest</option>
                <option value="low">Price, low to high</option>
                <option value="high">Price, high to low</option>
              </select>
            </label>
          </div>

          {subjects.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by subject">
              {subjects.map((s) => {
                const active = subject.toLowerCase() === s.label.toLowerCase();
                return (
                  <button
                    key={s.label}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setParam("subject", active ? "" : s.label)}
                    className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      active ? "border-stamp bg-stamp-soft text-stamp-dark" : "border-rule bg-white hover:border-slate2/50"
                    }`}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: subjectColor(s.label) }} />
                    {s.label}
                    <span className="text-slate2">{s.n}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-3 text-sm text-slate2">
            <p aria-live="polite">
              {filtered.length} {filtered.length === 1 ? "book" : "books"}
            </p>
            {hasFilters && (
              <button type="button" onClick={clearAll} className="font-medium text-stamp hover:underline">
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {status === "loading" && <BookGridSkeleton />}

      {status === "error" && (
        <EmptyState
          title="Couldn't load the listings"
          body="Check that the backend is running, then try again."
          action={<button type="button" onClick={load} className="btn-primary">Try again</button>}
        />
      )}

      {status === "ready" && books.length === 0 && (
        <EmptyState
          title="No books listed yet"
          body="Be the first to list one and get the shelf started."
          action={<Link to="/add-book" className="btn-primary">List a book</Link>}
        />
      )}

      {status === "ready" && books.length > 0 && filtered.length === 0 && (
        <EmptyState
          title="No books match"
          body={onlySaved && saved.length === 0 ? "Tap the heart on a book to save it here." : "Try a different word or remove a filter."}
          action={<button type="button" onClick={clearAll} className="btn-ghost">Clear filters</button>}
        />
      )}

      {status === "ready" && filtered.length > 0 && (
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((book) => (
            <BookCard key={book.id} book={book} saved={isSaved(book.id)} onToggleSave={toggle} />
          ))}
        </div>
      )}
    </div>
  );
}
