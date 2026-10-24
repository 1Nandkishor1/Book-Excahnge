package com.bookexchange.entity;

import com.bookexchange.entity.enums.OfferStatus;
import com.bookexchange.entity.enums.OfferType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "offers")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Offer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OfferType offerType; // BUY or SWAP

    private Double offeredPrice;

    // Only used when offerType == SWAP: description of the book being offered in exchange
    private String swapBookDescription;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private OfferStatus status = OfferStatus.PENDING;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "buyer_id", nullable = false)
    private User buyer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "book_id", nullable = false)
    private BookListing book;
}
