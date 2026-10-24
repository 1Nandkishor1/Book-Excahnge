import { Fragment, useCallback, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { bookAPI, offerAPI } from "../services/api";
import BookCover from "../components/BookCover";
import OfferDrawer from "../components/OfferDrawer";
import StatusPill from "../components/StatusPill";
import EmptyState from "../components/EmptyState";
import useSavedBooks from "../hooks/useSavedBooks";
import { ArrowLeftIcon, HeartIcon } from "../components/Icons";

export default function BookDetails() {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useSelector((s) => s.auth);
  const { isSaved, toggle } = useSavedBooks();
  const [book, setBook] = useState(null);
  const [state, setState] = useState("loading"); // loading | ready | missing
  const [myOffer, setMyOffer] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    let active = true;
    setState("loading");
    setBook(null);
    bookAPI
      .getById(id)
      .then((res) => {
        if (!active) return;
        setBook(res.data);
        setState("ready");
      })
      .catch(() => active && setState("missing"));
    return () => {
      active = false;
    };
  }, [id]);

  // If this person already made an offer on the book, show it instead of the form
  useEffect(() => {
    if (!user) {
      setMyOffer(null);
      return;
    }
    let active = true;
    offerAPI
      .getMine()
      .then((res) => {
        if (!active) return;
        const mine = res.data.filter((o) => String(o.bookId) === String(id));
        setMyOffer(mine.length ? mine[mine.length - 1] : null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [id, user]);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  if (state === "loading") {
    return (
      <div className="grid gap-10 md:grid-cols-[260px_1fr]" aria-hidden="true">
        <div className="aspect-[3/4] animate-pulse rounded-md bg-rule" />
        <div className="space-y-3">
          <div className="h-8 w-2/3 animate-pulse rounded bg-rule" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-rule" />
          <div className="h-24 animate-pulse rounded bg-rule" />
        </div>
      </div>
    );
  }

  if (state === "missing") {
    return (
      <EmptyState
        title="This listing isn't here anymore"
        body="The seller may have removed it."
        action={<Link to="/" className="btn-primary">Browse books</Link>}
      />
    );
  }

  const isOwner = user && book.sellerId === user.id;
  const details = [
    ["Subject", book.subject],
    ["Course", book.course],
    ["Edition", book.edition],
    ["Condition", book.condition],
  ].filter(([, v]) => v);

  let action;
  if (!user) {
    action = (
      <Link to="/login" state={{ from: location }} className="btn-primary px-5 py-2.5">
        Log in to make an offer
      </Link>
    );
  } else if (isOwner) {
    action = (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-slate2">This is your listing.</p>
        <Link to={`/edit-book/${book.id}`} className="btn-ghost">Edit listing</Link>
        <Link to="/offers" className="btn-ghost">See offers</Link>
      </div>
    );
  } else if (myOffer) {
    action = (
      <div className="flex flex-wrap items-center gap-3">
        <StatusPill status={myOffer.status} />
        <button type="button" onClick={() => setDrawerOpen(true)} className="btn-primary px-5 py-2.5">
          Open your offer and chat
        </button>
      </div>
    );
  } else if (book.available === false) {
    action = <p className="text-slate2">This book is no longer available.</p>;
  } else {
    action = (
      <button type="button" onClick={() => setDrawerOpen(true)} className="btn-primary px-5 py-2.5">
        Make an offer
      </button>
    );
  }

  return (
    <div>
      <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate2 hover:text-ink">
        <ArrowLeftIcon width={16} height={16} /> All books
      </Link>

      <div className="grid gap-10 md:grid-cols-[260px_1fr]">
        <div className="max-w-[260px]">
          <BookCover book={book} size="lg" />
        </div>

        <div>
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">{book.title}</h1>
          {book.author && <p className="mt-1 text-lg text-slate2">{book.author}</p>}

          <p className="mt-5 font-serif text-3xl font-semibold">
            {book.type === "SELL" ? `₹${book.price}` : "Open to swaps"}
          </p>

          {details.length > 0 && (
            <dl className="mt-6 grid max-w-md grid-cols-[7rem_1fr] gap-y-2 text-sm">
              {details.map(([k, v]) => (
                <Fragment key={k}>
                  <dt className="text-slate2">{k}</dt>
                  <dd>{v}</dd>
                </Fragment>
              ))}
            </dl>
          )}

          {book.description && <p className="mt-6 max-w-prose leading-relaxed">{book.description}</p>}

          <div className="mt-6 flex items-center gap-2 text-sm text-slate2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-stamp text-xs font-semibold text-white">
              {book.sellerName?.charAt(0).toUpperCase()}
            </span>
            Listed by {book.sellerName}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-rule pt-6">
            {action}
            <button
              type="button"
              onClick={() => toggle(book.id)}
              aria-pressed={isSaved(book.id)}
              className="btn-ghost"
            >
              <HeartIcon
                key={isSaved(book.id) ? "on" : "off"}
                filled={isSaved(book.id)}
                width={16}
                height={16}
                className={isSaved(book.id) ? "animate-pop text-brick" : ""}
              />
              {isSaved(book.id) ? "Saved" : "Save"}
            </button>
          </div>
        </div>
      </div>

      {user && !isOwner && (
        <OfferDrawer open={drawerOpen} onClose={closeDrawer} book={book} offer={myOffer} onCreated={setMyOffer} />
      )}
    </div>
  );
}
