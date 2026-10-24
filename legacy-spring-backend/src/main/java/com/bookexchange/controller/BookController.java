package com.bookexchange.controller;

import com.bookexchange.dto.BookDTO;
import com.bookexchange.entity.User;
import com.bookexchange.service.BookService;
import com.bookexchange.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/books")
@RequiredArgsConstructor
public class BookController {

    private final BookService bookService;
    private final UserService userService;

    @PostMapping
    public ResponseEntity<BookDTO> create(Authentication authentication, @Valid @RequestBody BookDTO dto) {
        User seller = userService.getByEmail(authentication.getName());
        return ResponseEntity.ok(bookService.create(dto, seller));
    }

    @GetMapping
    public ResponseEntity<List<BookDTO>> getAll() {
        return ResponseEntity.ok(bookService.getAllAvailable());
    }

    @GetMapping("/mine")
    public ResponseEntity<List<BookDTO>> getMine(Authentication authentication) {
        User seller = userService.getByEmail(authentication.getName());
        return ResponseEntity.ok(bookService.getMyListings(seller));
    }

    @GetMapping("/{id}")
    public ResponseEntity<BookDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(bookService.getById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<BookDTO> update(Authentication authentication,
                                           @PathVariable Long id,
                                           @Valid @RequestBody BookDTO dto) {
        User requester = userService.getByEmail(authentication.getName());
        return ResponseEntity.ok(bookService.update(id, dto, requester));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(Authentication authentication, @PathVariable Long id) {
        User requester = userService.getByEmail(authentication.getName());
        bookService.delete(id, requester);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/search")
    public ResponseEntity<List<BookDTO>> search(@RequestParam(required = false) String subject,
                                                  @RequestParam(required = false) String course,
                                                  @RequestParam(required = false) String author,
                                                  @RequestParam(required = false) String title) {
        return ResponseEntity.ok(bookService.search(subject, course, author, title));
    }

    @PostMapping("/upload-image")
    public ResponseEntity<Map<String, String>> uploadImage(@RequestParam("file") MultipartFile file) {
        String url = bookService.storeImage(file);
        return ResponseEntity.ok(Map.of("imageUrl", url));
    }
}
