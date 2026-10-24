import { useEffect, useRef, useState } from "react";
import { offerAPI } from "../services/api";
import { useToast } from "../context/ToastContext";
import { errorMessage } from "../utils/errors";
import ChatBox from "./ChatBox";
import Segmented from "./Segmented";
import StatusPill from "./StatusPill";
import { XIcon } from "./Icons";

function priceChips(asking) {
  if (!asking) return [];
  const round10 = (n) => Math.max(10, Math.round(n / 10) * 10);
  return [...new Set([asking, round10(asking * 0.9), round10(asking * 0.8)])];
}

export default function OfferDrawer({ open, onClose, book, offer, onCreated }) {
  const toast = useToast();
  const canBuy = book.type === "SELL";
  const [offerType, setOfferType] = useState(canBuy ? "BUY" : "SWAP");
  const [price, setPrice] = useState("");
  const [swap, setSwap] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const closeRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Lock page scroll, close on Escape, move focus into the drawer
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onCloseRef.current();
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open) return null;

  const valid = offerType === "BUY" ? Number(price) > 0 : swap.trim().length > 0;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      const res = await offerAPI.create({
        bookId: book.id,
        offerType,
        offeredPrice: offerType === "BUY" ? Number(price) : null,
        swapBookDescription: offerType === "SWAP" ? swap.trim() : null,
      });
      toast.success("Offer sent. You can chat with the seller now.");
      onCreated(res.data);
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't send the offer. Try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={offer ? "Your offer and chat" : "Make an offer"}
        className="absolute right-0 top-0 flex h-full w-full max-w-md animate-drawer flex-col bg-paper shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-rule p-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">{offer ? "Your offer" : "Make an offer"}</h2>
            <p className="truncate text-sm text-slate2">{book.title}</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="btn-ghost h-9 w-9 shrink-0 p-0">
            <XIcon width={16} height={16} />
          </button>
        </header>

        {offer ? (
          <>
            <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3 text-sm">
              <span>
                {offer.offerType === "BUY" ? `Offer of ₹${offer.offeredPrice}` : `Swap for ${offer.swapBookDescription}`}
              </span>
              <StatusPill status={offer.status} />
            </div>
            <div className="min-h-0 flex-1">
              <ChatBox offerId={offer.id} receiverId={book.sellerId} />
            </div>
          </>
        ) : (
          <form onSubmit={submit} className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
            <div>
              <span className="label">What would you like to do?</span>
              <Segmented
                label="Offer type"
                value={offerType}
                onChange={setOfferType}
                options={[
                  { value: "BUY", label: "Buy", disabled: !canBuy },
                  { value: "SWAP", label: "Swap" },
                ]}
              />
              {!canBuy && <p className="mt-2 text-sm text-slate2">The seller only wants a swap for this book.</p>}
            </div>

            {offerType === "BUY" ? (
              <div>
                <label htmlFor="offer-price" className="label">Your price</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate2">₹</span>
                  <input
                    id="offer-price"
                    type="number"
                    min="1"
                    inputMode="numeric"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="field pl-7"
                    autoFocus
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {priceChips(book.price).map((p, i) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPrice(String(p))}
                      className={`rounded-full border px-3 py-1 text-sm ${
                        Number(price) === p ? "border-stamp bg-stamp-soft text-stamp-dark" : "border-rule bg-white hover:border-stamp"
                      }`}
                    >
                      ₹{p}{i === 0 ? " (asking)" : ""}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label htmlFor="offer-swap" className="label">Which book would you swap?</label>
                <textarea
                  id="offer-swap"
                  rows={3}
                  value={swap}
                  onChange={(e) => setSwap(e.target.value)}
                  placeholder="Title, author and condition"
                  className="field"
                  autoFocus
                />
              </div>
            )}

            <button type="submit" disabled={!valid || submitting} className="btn-primary mt-auto py-2.5">
              {submitting ? "Sending…" : "Send offer"}
            </button>
          </form>
        )}
      </aside>
    </div>
  );
}
