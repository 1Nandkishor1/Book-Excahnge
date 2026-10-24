package com.bookexchange.dto;

import com.bookexchange.entity.enums.BookType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class BookDTO {
    private Long id;

    @NotBlank(message = "Title is required")
    private String title;

    private String author;
    private String subject;
    private String course;
    private String edition;
    private String condition;

    @NotNull(message = "Type (SELL or SWAP) is required")
    private BookType type;

    private Double price;
    private String description;
    private String imageUrl;
    private Boolean available;

    // populated on read
    private Long sellerId;
    private String sellerName;
}
