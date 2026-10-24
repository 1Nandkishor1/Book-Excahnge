import { Book } from "../models/Book.js";
import { Offer } from "../models/Offer.js";
import { nextId } from "../models/Counter.js";
import { bookDto } from "../utils/dto.js";
import { ValidationFailure, badRequest, notFound } from "../utils/errors.js";
import { validate, required, oneOf, maxLength, nonNegativeNumber } from "../utils/validate.js";

const withSeller = (q) => q.populate("seller");
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const text = (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);

function check(body) {
  validate(body, {
    title: [required("Title is required")],
    type: [required("Type (SELL or SWAP) is required"), oneOf(["SELL", "SWAP"], "Type must be SELL or SWAP")],
    price: [nonNegativeNumber("Price must be a positive number")],
    description: [maxLength(1000, "Description can be at most 1000 characters")],
  });
  if (body.type === "SELL" && !(Number(body.price) > 0)) {
    throw new ValidationFailure({ price: "Price is required for a book that is for sale" });
  }
}

const fields = (body) => ({
  title: body.title.trim(),
  author: text(body.author),
  subject: text(body.subject),
  course: text(body.course),
  edition: text(body.edition),
  condition: text(body.condition),
  type: body.type,
  price: body.type === "SELL" ? Number(body.price) : null,
  description: text(body.description),
});

async function getEntity(id) {
  const book = await withSeller(Book.findById(id));
  if (!book) throw notFound(`Book listing not found with id: ${id}`);
  return book;
}

function assertOwner(book, user) {
  if (book.seller._id !== user._id) throw badRequest("You are not the owner of this listing");
}

export async function create(body, seller) {
  check(body);
  const book = await Book.create({
    _id: await nextId("books"),
    ...fields(body),
    imageUrl: text(body.imageUrl),
    available: true,
    seller: seller._id,
  });
  return bookDto(await getEntity(book._id));
}

export async function update(id, body, requester) {
  const book = await getEntity(id);
  assertOwner(book, requester);
  check(body);

  Object.assign(book, fields(body));
  if (body.imageUrl) book.imageUrl = body.imageUrl; // an update never clears the image
  if (typeof body.available === "boolean") book.available = body.available;
  await book.save();
  return bookDto(book);
}

export async function remove(id, requester) {
  const book = await getEntity(id);
  assertOwner(book, requester);
  if (await Offer.exists({ book: id })) {
    throw badRequest("This listing has offers, so it can't be deleted. Remove it from browse instead.");
  }
  await book.deleteOne();
}

export const getById = async (id) => bookDto(await getEntity(id));

export async function getAllAvailable() {
  const books = await withSeller(Book.find({ available: true }).sort({ _id: 1 }));
  return books.map(bookDto);
}

export async function getMine(seller) {
  const books = await withSeller(Book.find({ seller: seller._id }).sort({ _id: 1 }));
  return books.map(bookDto);
}

// subject and course match exactly (ignoring case); author and title match anywhere in the text
export async function search({ subject, course, author, title }) {
  const exact = (v) => new RegExp(`^${escapeRegex(v.trim())}$`, "i");
  const partial = (v) => new RegExp(escapeRegex(v.trim()), "i");
  const filter = { available: true };
  if (text(subject)) filter.subject = exact(subject);
  if (text(course)) filter.course = exact(course);
  if (text(author)) filter.author = partial(author);
  if (text(title)) filter.title = partial(title);
  const books = await withSeller(Book.find(filter).sort({ _id: 1 }));
  return books.map(bookDto);
}
