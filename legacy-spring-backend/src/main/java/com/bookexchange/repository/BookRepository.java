package com.bookexchange.repository;

import com.bookexchange.entity.BookListing;
import com.bookexchange.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface BookRepository extends JpaRepository<BookListing, Long> {

    List<BookListing> findBySeller(User seller);

    List<BookListing> findByAvailableTrue();

    List<BookListing> findBySubjectIgnoreCaseAndAvailableTrue(String subject);

    List<BookListing> findByCourseIgnoreCaseAndAvailableTrue(String course);

    List<BookListing> findByAuthorContainingIgnoreCaseAndAvailableTrue(String author);

    List<BookListing> findByTitleContainingIgnoreCaseAndAvailableTrue(String title);

    @Query("SELECT b FROM BookListing b WHERE b.available = true AND " +
           "(:subject IS NULL OR LOWER(b.subject) = LOWER(:subject)) AND " +
           "(:course IS NULL OR LOWER(b.course) = LOWER(:course)) AND " +
           "(:author IS NULL OR LOWER(b.author) LIKE LOWER(CONCAT('%', :author, '%'))) AND " +
           "(:title IS NULL OR LOWER(b.title) LIKE LOWER(CONCAT('%', :title, '%')))")
    List<BookListing> search(@Param("subject") String subject,
                              @Param("course") String course,
                              @Param("author") String author,
                              @Param("title") String title);
}
