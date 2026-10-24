package com.bookexchange.service;

import com.bookexchange.dto.MessageDTO;
import com.bookexchange.entity.Message;
import com.bookexchange.entity.Offer;
import com.bookexchange.entity.User;
import com.bookexchange.exception.BadRequestException;
import com.bookexchange.exception.ResourceNotFoundException;
import com.bookexchange.repository.MessageRepository;
import com.bookexchange.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final OfferService offerService;

    // @Transactional keeps the Hibernate session open for the whole method,
    // which WebSocket threads need (they have no open-session-in-view).
    @Transactional
    public MessageDTO sendMessage(MessageDTO dto, User sender) {
        Offer offer = offerService.getEntity(dto.getOfferId());

        // Only the buyer and the book's seller may chat on this offer thread
        boolean isParticipant = offer.getBuyer().getId().equals(sender.getId())
                || offer.getBook().getSeller().getId().equals(sender.getId());
        if (!isParticipant) {
            throw new BadRequestException("You are not part of this conversation");
        }

        User receiver = userRepository.findById(dto.getReceiverId())
                .orElseThrow(() -> new ResourceNotFoundException("Receiver not found"));

        Message message = Message.builder()
                .content(dto.getContent())
                .sender(sender)
                .receiver(receiver)
                .offer(offer)
                .seen(false)
                .build();

        return toDto(messageRepository.save(message));
    }

    @Transactional(readOnly = true)
    public List<MessageDTO> getMessagesForOffer(Long offerId) {
        return messageRepository.findByOfferIdOrderByTimeAsc(offerId)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    private MessageDTO toDto(Message message) {
        MessageDTO dto = new MessageDTO();
        dto.setId(message.getId());
        dto.setOfferId(message.getOffer().getId());
        dto.setReceiverId(message.getReceiver().getId());
        dto.setSenderId(message.getSender().getId());
        dto.setSenderName(message.getSender().getFullName());
        dto.setContent(message.getContent());
        dto.setTime(message.getTime());
        dto.setSeen(message.getSeen());
        return dto;
    }
}
