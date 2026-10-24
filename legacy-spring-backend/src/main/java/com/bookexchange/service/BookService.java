package com.bookexchange.service;

import com.bookexchange.dto.BookDTO;
import com.bookexchange.entity.BookListing;
import com.bookexchange.entity.User;
import com.bookexchange.exception.BadRequestException;
import com.bookexchange.exception.ResourceNotFoundException;
import com.bookexchange.repository.BookRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookService {

    private final BookRepository bookRepository;

    @Value("${file.upload-dir}")
    private String uploadDir;

    public BookDTO create(BookDTO dto, User seller) {
        BookListing book = BookListing.builder()
                .title(dto.getTitle())
                .author(dto.getAuthor())
                .subject(dto.getSubject())
                .course(dto.getCourse())
                .edition(dto.getEdition())
                .condition(dto.getCondition())
                .type(dto.getType())
                .price(dto.getPrice())
                .description(dto.getDescription())
                .imageUrl(dto.getImageUrl())
                .available(true)
                .seller(seller)
                .build();

        return toDto(bookRepository.save(book));
    }

    public BookDTO update(Long id, BookDTO dto, User requester) {
        BookListing book = getEntity(id);
        assertOwner(book, requester);

        book.setTitle(dto.getTitle());
        book.setAuthor(dto.getAuthor());
        book.setSubject(dto.getSubject());
        book.setCourse(dto.getCourse());
        book.setEdition(dto.getEdition());
        book.setCondition(dto.getCondition());
        book.setType(dto.getType());
        book.setPrice(dto.getPrice());
        book.setDescription(dto.getDescription());
        if (dto.getImageUrl() != null) {
            book.setImageUrl(dto.getImageUrl());
        }
        if (dto.getAvailable() != null) {
            book.setAvailable(dto.getAvailable());
        }

        return toDto(bookRepository.save(book));
    }

    public void delete(Long id, User requester) {
        BookListing book = getEntity(id);
        assertOwner(book, requester);
        bookRepository.delete(book);
    }

    public BookDTO getById(Long id) {
        return toDto(getEntity(id));
    }

    public List<BookDTO> getAllAvailable() {
        return bookRepository.findByAvailableTrue().stream().map(this::toDto).collect(Collectors.toList());
    }

    public List<BookDTO> getMyListings(User seller) {
        return bookRepository.findBySeller(seller).stream().map(this::toDto).collect(Collectors.toList());
    }

    public List<BookDTO> search(String subject, String course, String author, String title) {
        return bookRepository.search(
                        blankToNull(subject), blankToNull(course), blankToNull(author), blankToNull(title))
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    public String storeImage(MultipartFile file) {
        try {
            Path dirPath = Paths.get(uploadDir);
            if (!Files.exists(dirPath)) {
                Files.createDirectories(dirPath);
            }

            String extension = "";
            String original = file.getOriginalFilename();
            if (original != null && original.contains(".")) {
                extension = original.substring(original.lastIndexOf("."));
            }
            String filename = UUID.randomUUID() + extension;

            Path target = dirPath.resolve(filename);
            Files.copy(file.getInputStream(), target);

            return "/uploads/" + filename;
        } catch (IOException e) {
            throw new BadRequestException("Failed to store image: " + e.getMessage());
        }
    }

    private void assertOwner(BookListing book, User requester) {
        if (!book.getSeller().getId().equals(requester.getId())) {
            throw new BadRequestException("You are not the owner of this listing");
        }
    }

    private BookListing getEntity(Long id) {
        return bookRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Book listing not found with id: " + id));
    }

    private String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }

    private BookDTO toDto(BookListing book) {
        BookDTO dto = new BookDTO();
        dto.setId(book.getId());
        dto.setTitle(book.getTitle());
        dto.setAuthor(book.getAuthor());
        dto.setSubject(book.getSubject());
        dto.setCourse(book.getCourse());
        dto.setEdition(book.getEdition());
        dto.setCondition(book.getCondition());
        dto.setType(book.getType());
        dto.setPrice(book.getPrice());
        dto.setDescription(book.getDescription());
        dto.setImageUrl(book.getImageUrl());
        dto.setAvailable(book.getAvailable());
        dto.setSellerId(book.getSeller().getId());
        dto.setSellerName(book.getSeller().getFullName());
        return dto;
    }
}
