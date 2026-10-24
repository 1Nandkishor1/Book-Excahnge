package com.bookexchange.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class MessageDTO {
    private Long id;

    @NotNull(message = "offerId is required")
    private Long offerId;

    @NotNull(message = "receiverId is required")
    private Long receiverId;

    @NotBlank(message = "content is required")
    private String content;

    // populated on read
    private Long senderId;
    private String senderName;
    private LocalDateTime time;
    private Boolean seen;
}
