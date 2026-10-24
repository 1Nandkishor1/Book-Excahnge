package com.bookexchange.dto;

import lombok.Data;

@Data
public class UserProfileDTO {
    private Long id;
    private String fullName;
    private String email;
    private String phone;
    private String college;
    private String department;
}
