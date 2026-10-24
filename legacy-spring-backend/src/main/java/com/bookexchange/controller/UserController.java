package com.bookexchange.controller;

import com.bookexchange.dto.UserProfileDTO;
import com.bookexchange.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/profile")
    public ResponseEntity<UserProfileDTO> getProfile(Authentication authentication) {
        return ResponseEntity.ok(userService.getProfile(authentication.getName()));
    }

    @PutMapping("/profile")
    public ResponseEntity<UserProfileDTO> updateProfile(Authentication authentication,
                                                          @RequestBody UserProfileDTO dto) {
        return ResponseEntity.ok(userService.updateProfile(authentication.getName(), dto));
    }
}
