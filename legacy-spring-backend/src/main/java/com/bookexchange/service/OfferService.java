package com.bookexchange.service;

import com.bookexchange.dto.OfferDTO;
import com.bookexchange.entity.BookListing;
import com.bookexchange.entity.Offer;
import com.bookexchange.entity.User;
import com.bookexchange.entity.enums.OfferStatus;
import com.bookexchange.entity.enums.OfferType;
import com.bookexchange.exception.BadRequestException;
import com.bookexchange.exception.ResourceNotFoundException;
import com.bookexchange.repository.BookRepository;
import com.bookexchange.repository.OfferRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OfferService {

    private final OfferRepository offerRepository;
    private final BookRepository bookRepository;

    public OfferDTO createOffer(OfferDTO dto, User buyer) {
        BookListing book = bookRepository.findById(dto.getBookId())
                .orElseThrow(() -> new ResourceNotFoundException("Book listing not found with id: " + dto.getBookId()));

        if (!book.getAvailable()) {
            throw new BadRequestException("This book is no longer available");
        }
        if (book.getSeller().getId().equals(buyer.getId())) {
            throw new BadRequestException("You cannot make an offer on your own listing");
        }
        if (dto.getOfferType() == OfferType.BUY && dto.getOfferedPrice() == null) {
            throw new BadRequestException("offeredPrice is required for a BUY offer");
        }
        if (dto.getOfferType() == OfferType.SWAP && (dto.getSwapBookDescription() == null || dto.getSwapBookDescription().isBlank())) {
            throw new BadRequestException("swapBookDescription is required for a SWAP offer");
        }

        Offer offer = Offer.builder()
                .offerType(dto.getOfferType())
                .offeredPrice(dto.getOfferedPrice())
                .swapBookDescription(dto.getSwapBookDescription())
                .status(OfferStatus.PENDING)
                .buyer(buyer)
                .book(book)
                .build();

        return toDto(offerRepository.save(offer));
    }

    public OfferDTO accept(Long offerId, User requester) {
        Offer offer = getEntity(offerId);
        assertSeller(offer, requester);

        offer.setStatus(OfferStatus.ACCEPTED);
        offerRepository.save(offer);

        BookListing book = offer.getBook();
        book.setAvailable(false);
        bookRepository.save(book);

        return toDto(offer);
    }

    public OfferDTO reject(Long offerId, User requester) {
        Offer offer = getEntity(offerId);
        assertSeller(offer, requester);

        offer.setStatus(OfferStatus.REJECTED);
        return toDto(offerRepository.save(offer));
    }

    public List<OfferDTO> getMyOffers(User buyer) {
        return offerRepository.findByBuyer(buyer).stream().map(this::toDto).collect(Collectors.toList());
    }

    public List<OfferDTO> getOffersReceived(User seller) {
        return offerRepository.findByBookSeller(seller).stream().map(this::toDto).collect(Collectors.toList());
    }

    public Offer getEntity(Long id) {
        return offerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Offer not found with id: " + id));
    }

    private void assertSeller(Offer offer, User requester) {
        if (!offer.getBook().getSeller().getId().equals(requester.getId())) {
            throw new BadRequestException("Only the seller of this book can respond to the offer");
        }
    }

    private OfferDTO toDto(Offer offer) {
        OfferDTO dto = new OfferDTO();
        dto.setId(offer.getId());
        dto.setBookId(offer.getBook().getId());
        dto.setBookTitle(offer.getBook().getTitle());
        dto.setOfferType(offer.getOfferType());
        dto.setOfferedPrice(offer.getOfferedPrice());
        dto.setSwapBookDescription(offer.getSwapBookDescription());
        dto.setStatus(offer.getStatus());
        dto.setBuyerId(offer.getBuyer().getId());
        dto.setBuyerName(offer.getBuyer().getFullName());
        dto.setSellerId(offer.getBook().getSeller().getId());
        dto.setSellerName(offer.getBook().getSeller().getFullName());
        dto.setBookSubject(offer.getBook().getSubject());
        dto.setBookImageUrl(offer.getBook().getImageUrl());
        return dto;
    }
}
