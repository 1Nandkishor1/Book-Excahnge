import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { offerAPI } from "../services/api";
import ChatBox from "../components/ChatBox";
import BookCover from "../components/BookCover";
import StatusPill from "../components/StatusPill";
import ConfirmButton from "../components/ConfirmButton";
import EmptyState from "../components/EmptyState";
import Segmented from "../components/Segmented";
import { RowSkeleton } from "../components/Skeleton";
import { ArrowLeftIcon } from "../components/Icons";
import { useToast } from "../context/ToastContext";
import { errorMessage } from "../utils/errors";

const SELLER_SUGGESTIONS = [
  "Yes, it's still available.",
  "I can meet at the library after lectures.",
  "Let's meet at the canteen.",
];

const summary = (o) => (o.offerType === "BUY" ? `Offer of ₹${o.offeredPrice}` : `Swap for ${o.swapBookDescription}`);

function OfferRow({ offer, active, otherName, onSelect }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(offer.id)}
        aria-current={active ? "true" : undefined}
        className={`flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors ${active ? "bg-stamp-soft" : "hover:bg-white"}`}
      >
        <BookCover
          book={{ title: offer.bookTitle, subject: offer.bookSubject, imageUrl: offer.bookImageUrl }}
          size="sm"
          className="w-12 shrink-0"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-serif text-[15px] font-semibold">{offer.bookTitle}</span>
          <span className="block truncate text-sm text-slate2">{otherName}</span>
          <span className="mt-1.5 flex items-center gap-2">
            <StatusPill status={offer.status} />
            <span className="truncate text-sm">{summary(offer)}</span>
          </span>
        </span>
      </button>
    </li>
  );
}

export default function Offers() {
  const toast = useToast();
  const { user } = useSelector((s) => s.auth);
  const [params, setParams] = useSearchParams();
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(params.get("tab") || "received");
  const selectedId = params.get("offer");

  useEffect(() => {
    let active = true;
    Promise.all([offerAPI.getReceived(), offerAPI.getMine()])
      .then(([rec, snt]) => {
        if (!active) return;
        const r = rec.data.sort((a, b) => b.id - a.id);
        const s = snt.data.sort((a, b) => b.id - a.id);
        setReceived(r);
        setSent(s);
        // Land on the tab that has something to show, or the one a shared link points at
        if (selectedId) {
          if (s.some((o) => String(o.id) === selectedId)) setTab("sent");
          else if (r.some((o) => String(o.id) === selectedId)) setTab("received");
        } else if (!params.get("tab") && r.length === 0 && s.length > 0) {
          setTab("sent");
        }
      })
      .catch((err) => toast.error(errorMessage(err, "Couldn't load your offers.")))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isReceived = tab === "received";
  const list = isReceived ? received : sent;
  const selected = list.find((o) => String(o.id) === selectedId) || null;

  const changeTab = (value) => {
    setTab(value);
    setParams({ tab: value });
  };
  const select = (id) => setParams({ tab, offer: String(id) });
  const back = () => setParams({ tab });

  const respond = async (offer, action) => {
    const nextStatus = action === "accept" ? "ACCEPTED" : "REJECTED";
    const update = (status) => setReceived((l) => l.map((o) => (o.id === offer.id ? { ...o, status } : o)));
    update(nextStatus);
    try {
      await (action === "accept" ? offerAPI.accept(offer.id) : offerAPI.reject(offer.id));
      toast.success(action === "accept" ? "Offer accepted. The book is now hidden from browse." : "Offer declined.");
    } catch (err) {
      update(offer.status);
      toast.error(errorMessage(err, "Couldn't update the offer."));
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-3xl font-semibold">Offers</h1>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className={selected ? "hidden lg:block" : ""}>
          <Segmented
            label="Offers"
            value={tab}
            onChange={changeTab}
            options={[
              { value: "received", label: "Received", count: received.length },
              { value: "sent", label: "Sent", count: sent.length },
            ]}
          />

          <div className="mt-4">
            {loading ? (
              <RowSkeleton />
            ) : list.length === 0 ? (
              <EmptyState
                title={isReceived ? "No offers on your books yet" : "You haven't made any offers"}
                body={isReceived ? "When someone makes an offer, it shows up here." : "Find a book you need and make an offer."}
                action={
                  isReceived ? (
                    <Link to="/add-book" className="btn-primary">List a book</Link>
                  ) : (
                    <Link to="/" className="btn-primary">Browse books</Link>
                  )
                }
              />
            ) : (
              <ul className="space-y-1">
                {list.map((o) => (
                  <OfferRow
                    key={o.id}
                    offer={o}
                    active={selected?.id === o.id}
                    otherName={isReceived ? `From ${o.buyerName}` : `To ${o.sellerName}`}
                    onSelect={select}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className={`${selected ? "" : "hidden lg:block"} h-[calc(100vh-11rem)] min-h-[28rem]`}>
          {selected ? (
            <section className="flex h-full min-h-0 flex-col rounded-xl border border-rule bg-white">
              <header className="border-b border-rule p-4">
                <button type="button" onClick={back} className="mb-2 inline-flex items-center gap-1 text-sm text-slate2 hover:text-ink lg:hidden">
                  <ArrowLeftIcon width={16} height={16} /> All offers
                </button>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link to={`/books/${selected.bookId}`} className="font-serif text-lg font-semibold hover:underline">
                      {selected.bookTitle}
                    </Link>
                    <p className="mt-0.5 text-sm">{summary(selected)}</p>
                    <p className="text-sm text-slate2">
                      {isReceived ? `From ${selected.buyerName}` : `To ${selected.sellerName}`}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusPill status={selected.status} />
                    {isReceived && selected.status === "PENDING" && (
                      <div className="flex gap-2">
                        <ConfirmButton
                          confirmLabel="Confirm decline"
                          onConfirm={() => respond(selected, "reject")}
                          className="btn-ghost py-1.5"
                          armedClassName="btn-danger py-1.5"
                        >
                          Decline
                        </ConfirmButton>
                        <ConfirmButton
                          confirmLabel="Confirm accept"
                          onConfirm={() => respond(selected, "accept")}
                          className="btn-primary py-1.5"
                          armedClassName="btn-primary bg-pine py-1.5 hover:bg-pine"
                        >
                          Accept
                        </ConfirmButton>
                      </div>
                    )}
                  </div>
                </div>
              </header>
              <div className="min-h-0 flex-1">
                <ChatBox
                  key={selected.id}
                  offerId={selected.id}
                  receiverId={selected.buyerId === user.id ? selected.sellerId : selected.buyerId}
                  suggestions={isReceived ? SELLER_SUGGESTIONS : undefined}
                />
              </div>
            </section>
          ) : (
            <div className="grid h-full place-items-center rounded-xl border border-dashed border-rule text-sm text-slate2">
              Select an offer to read the conversation
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
