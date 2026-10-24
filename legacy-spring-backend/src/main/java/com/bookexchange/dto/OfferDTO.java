package com.bookexchange.dto;

import com.bookexchange.entity.enums.OfferStatus;
import com.bookexchange.entity.enums.OfferType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class OfferDTO {
    private Long id;

    @NotNull(message = "bookId is required")
    private Long bookId;

    @NotNull(message = "offerType is required")
    private OfferType offerType; // BUY or SWAP

    private Double offeredPrice;      // required when offerType == BUY
    private String swapBookDescription; // required when offerType == SWAP

    private OfferStatus status;

    // populated on read
    private Long buyerId;
    private String buyerName;
    private String bookTitle;
    private Long sellerId;
    private String sellerName;
    private String bookSubject;
    private String bookImageUrl;
}
