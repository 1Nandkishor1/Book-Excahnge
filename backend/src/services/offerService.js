import { Book } from "../models/Book.js";
import { Offer } from "../models/Offer.js";
import { nextId } from "../models/Counter.js";
import { offerDto } from "../utils/dto.js";
import { badRequest, notFound } from "../utils/errors.js";
import { validate, required, oneOf } from "../utils/validate.js";

const full = (q) => q.populate("buyer").populate({ path: "book", populate: { path: "seller" } });

async function getEntity(id) {
  const offer = await full(Offer.findById(id));
  if (!offer) throw notFound(`Offer not found with id: ${id}`);
  return offer;
}

export async function createOffer(body, buyer) {
  validate(body, {
    bookId: [required("bookId is required")],
    offerType: [required("offerType is required"), oneOf(["BUY", "SWAP"], "offerType must be BUY or SWAP")],
  });

  const book = await Book.findById(Number(body.bookId));
  if (!book) throw notFound(`Book listing not found with id: ${body.bookId}`);
  if (!book.available) throw badRequest("This book is no longer available");
  if (book.seller === buyer._id) throw badRequest("You cannot make an offer on your own listing");

  let offeredPrice = null;
  let swapBookDescription = null;
  if (body.offerType === "BUY") {
    offeredPrice = Number(body.offeredPrice);
    if (body.offeredPrice == null || !(offeredPrice > 0)) throw badRequest("offeredPrice is required for a BUY offer");
  } else {
    swapBookDescription = typeof body.swapBookDescription === "string" ? body.swapBookDescription.trim() : "";
    if (!swapBookDescription) throw badRequest("swapBookDescription is required for a SWAP offer");
  }

  if (await Offer.exists({ book: book._id, buyer: buyer._id, status: "PENDING" })) {
    throw badRequest("You already have a pending offer on this book");
  }

  const offer = await Offer.create({
    _id: await nextId("offers"),
    offerType: body.offerType,
    offeredPrice,
    swapBookDescription,
    status: "PENDING",
    buyer: buyer._id,
    book: book._id,
  });
  return offerDto(await getEntity(offer._id));
}

async function respond(offerId, requester, status) {
  const offer = await getEntity(offerId);
  if (offer.book.seller._id !== requester._id) {
    throw badRequest("Only the seller of this book can respond to the offer");
  }
  offer.status = status;
  await offer.save();
  if (status === "ACCEPTED") {
    await Book.updateOne({ _id: offer.book._id }, { available: false });
    offer.book.available = false;
  }
  return offerDto(offer);
}

export const accept = (id, requester) => respond(id, requester, "ACCEPTED");
export const reject = (id, requester) => respond(id, requester, "REJECTED");

export async function getMyOffers(buyer) {
  const offers = await full(Offer.find({ buyer: buyer._id }).sort({ _id: 1 }));
  return offers.map(offerDto);
}

export async function getOffersReceived(seller) {
  const bookIds = await Book.find({ seller: seller._id }).distinct("_id");
  const offers = await full(Offer.find({ book: { $in: bookIds } }).sort({ _id: 1 }));
  return offers.map(offerDto);
}
