package com.bookexchange.controller;

import com.bookexchange.dto.OfferDTO;
import com.bookexchange.entity.User;
import com.bookexchange.service.OfferService;
import com.bookexchange.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/offers")
@RequiredArgsConstructor
public class OfferController {

    private final OfferService offerService;
    private final UserService userService;

    @PostMapping
    public ResponseEntity<OfferDTO> create(Authentication authentication, @Valid @RequestBody OfferDTO dto) {
        User buyer = userService.getByEmail(authentication.getName());
        return ResponseEntity.ok(offerService.createOffer(dto, buyer));
    }

    @GetMapping
    public ResponseEntity<List<OfferDTO>> myOffers(Authentication authentication) {
        User buyer = userService.getByEmail(authentication.getName());
        return ResponseEntity.ok(offerService.getMyOffers(buyer));
    }

    @GetMapping("/received")
    public ResponseEntity<List<OfferDTO>> offersReceived(Authentication authentication) {
        User seller = userService.getByEmail(authentication.getName());
        return ResponseEntity.ok(offerService.getOffersReceived(seller));
    }

    @PutMapping("/{id}/accept")
    public ResponseEntity<OfferDTO> accept(Authentication authentication, @PathVariable Long id) {
        User seller = userService.getByEmail(authentication.getName());
        return ResponseEntity.ok(offerService.accept(id, seller));
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<OfferDTO> reject(Authentication authentication, @PathVariable Long id) {
        User seller = userService.getByEmail(authentication.getName());
        return ResponseEntity.ok(offerService.reject(id, seller));
    }
}
