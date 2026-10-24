import { Message } from "../models/Message.js";
import { Offer } from "../models/Offer.js";
import { nextId } from "../models/Counter.js";
import { messageDto } from "../utils/dto.js";
import { badRequest, notFound } from "../utils/errors.js";
import { validate, required, maxLength } from "../utils/validate.js";

// Only the buyer and the book's seller can read or write an offer's conversation.
// Returns { offer, participants: [buyerId, sellerId] }.
export async function assertParticipant(offerId, userId) {
  const offer = await Offer.findById(offerId).populate("book");
  if (!offer) throw notFound(`Offer not found with id: ${offerId}`);
  const participants = [offer.buyer, offer.book.seller];
  if (!participants.includes(userId)) throw badRequest("You are not part of this conversation");
  return { offer, participants };
}

export async function sendMessage(body, sender) {
  validate(body, {
    offerId: [required("offerId is required")],
    receiverId: [required("receiverId is required")],
    content: [required("content is required"), maxLength(2000, "Messages can be at most 2000 characters")],
  });

  const { participants } = await assertParticipant(Number(body.offerId), sender._id);
  const receiverId = Number(body.receiverId);
  if (!participants.includes(receiverId) || receiverId === sender._id) {
    throw badRequest("The receiver must be the other person in this conversation");
  }

  const message = await Message.create({
    _id: await nextId("messages"),
    content: body.content.trim(),
    sender: sender._id,
    receiver: receiverId,
    offer: Number(body.offerId),
  });
  // sender is already loaded, so reuse it instead of populating again
  return messageDto({ ...message.toObject(), sender });
}

export async function getMessagesForOffer(offerId, requester) {
  await assertParticipant(offerId, requester._id);
  const messages = await Message.find({ offer: offerId }).sort({ time: 1, _id: 1 }).populate("sender");
  return messages.map(messageDto);
}
