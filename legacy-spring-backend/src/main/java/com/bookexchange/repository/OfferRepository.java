package com.bookexchange.repository;

import com.bookexchange.entity.BookListing;
import com.bookexchange.entity.Offer;
import com.bookexchange.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OfferRepository extends JpaRepository<Offer, Long> {
    List<Offer> findByBuyer(User buyer);
    List<Offer> findByBook(BookListing book);
    List<Offer> findByBookSeller(User seller);
}
