package com.bookexchange.controller;

import com.bookexchange.dto.MessageDTO;
import com.bookexchange.entity.User;
import com.bookexchange.service.MessageService;
import com.bookexchange.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;
    private final UserService userService;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * REST: fetch full chat history for an offer thread (used to
     * populate the chat window when it first opens).
     */
    @GetMapping("/messages/{offerId}")
    public ResponseEntity<List<MessageDTO>> getMessages(@PathVariable Long offerId) {
        return ResponseEntity.ok(messageService.getMessagesForOffer(offerId));
    }

    /**
     * REST fallback for sending a message without a WebSocket connection.
     */
    @PostMapping("/messages")
    public ResponseEntity<MessageDTO> sendViaRest(Authentication authentication, @Valid @RequestBody MessageDTO dto) {
        User sender = userService.getByEmail(authentication.getName());
        return ResponseEntity.ok(messageService.sendMessage(dto, sender));
    }

    /**
     * STOMP: client sends to /app/chat.send with a MessageDTO payload.
     * The saved message is broadcast to /topic/offer/{offerId} so both
     * participants receive it in real time.
     *
     * `principal` is the authenticated user's email, resolved from the
     * JWT during the WebSocket handshake (see JwtFilter, which also runs
     * on the initial SockJS HTTP handshake request).
     */
    @MessageMapping("/chat.send")
    public void sendViaWebSocket(MessageDTO dto, Principal principal) {
        User sender = userService.getByEmail(principal.getName());
        MessageDTO saved = messageService.sendMessage(dto, sender);
        messagingTemplate.convertAndSend("/topic/offer/" + saved.getOfferId(), saved);
    }
}
