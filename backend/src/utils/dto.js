const iso = (d) => (d ? new Date(d).toISOString() : null);

export const profileDto = (u) => ({
  id: u._id,
  fullName: u.fullName,
  email: u.email,
  phone: u.phone ?? null,
  college: u.college ?? null,
  department: u.department ?? null,
});

export const authDto = (u, token) => ({ token, userId: u._id, fullName: u.fullName, email: u.email });

// book.seller must be populated
export const bookDto = (b) => ({
  id: b._id,
  title: b.title,
  author: b.author ?? null,
  subject: b.subject ?? null,
  course: b.course ?? null,
  edition: b.edition ?? null,
  condition: b.condition ?? null,
  type: b.type,
  price: b.price ?? null,
  description: b.description ?? null,
  imageUrl: b.imageUrl ?? null,
  available: b.available,
  sellerId: b.seller._id,
  sellerName: b.seller.fullName,
});

// offer.buyer and offer.book (with book.seller) must be populated
export const offerDto = (o) => ({
  id: o._id,
  bookId: o.book._id,
  offerType: o.offerType,
  offeredPrice: o.offeredPrice ?? null,
  swapBookDescription: o.swapBookDescription ?? null,
  status: o.status,
  buyerId: o.buyer._id,
  buyerName: o.buyer.fullName,
  bookTitle: o.book.title,
  sellerId: o.book.seller._id,
  sellerName: o.book.seller.fullName,
  bookSubject: o.book.subject ?? null,
  bookImageUrl: o.book.imageUrl ?? null,
});

// message.sender must be populated
export const messageDto = (m) => ({
  id: m._id,
  offerId: m.offer,
  receiverId: m.receiver,
  senderId: m.sender._id,
  senderName: m.sender.fullName,
  content: m.content,
  time: iso(m.time),
  seen: m.seen,
});
