package com.bookexchange.entity;

import com.bookexchange.entity.enums.BookType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "book_listings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookListing {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    private String author;

    private String subject;

    private String course;

    private String edition;

    @Column(name = "book_condition")
    private String condition;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BookType type; // SELL or SWAP

    private Double price;

    @Column(length = 1000)
    private String description;

    private String imageUrl;

    @Builder.Default
    private Boolean available = true;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seller_id", nullable = false)
    private User seller;
}
