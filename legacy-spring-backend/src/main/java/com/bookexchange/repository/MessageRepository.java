package com.bookexchange.repository;

import com.bookexchange.entity.Message;
import com.bookexchange.entity.Offer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByOfferIdOrderByTimeAsc(Long offerId);
    List<Message> findByOffer(Offer offer);
}
