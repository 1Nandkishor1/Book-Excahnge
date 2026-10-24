package com.bookexchange.service;

import com.bookexchange.dto.AuthResponseDTO;
import com.bookexchange.dto.LoginDTO;
import com.bookexchange.dto.RegisterDTO;
import com.bookexchange.dto.UserProfileDTO;
import com.bookexchange.entity.User;
import com.bookexchange.exception.BadRequestException;
import com.bookexchange.exception.ResourceNotFoundException;
import com.bookexchange.repository.UserRepository;
import com.bookexchange.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final CustomUserDetailsService userDetailsService;

    public AuthResponseDTO register(RegisterDTO dto) {
        if (userRepository.existsByEmail(dto.getEmail())) {
            throw new BadRequestException("An account with this email already exists");
        }

        User user = User.builder()
                .fullName(dto.getFullName())
                .email(dto.getEmail())
                .password(passwordEncoder.encode(dto.getPassword()))
                .phone(dto.getPhone())
                .college(dto.getCollege())
                .department(dto.getDepartment())
                .build();

        User saved = userRepository.save(user);
        UserDetails userDetails = userDetailsService.loadUserByUsername(saved.getEmail());
        String token = jwtUtil.generateToken(userDetails);

        return AuthResponseDTO.builder()
                .token(token)
                .userId(saved.getId())
                .fullName(saved.getFullName())
                .email(saved.getEmail())
                .build();
    }

    public AuthResponseDTO login(LoginDTO dto) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(dto.getEmail(), dto.getPassword())
        );

        User user = userRepository.findByEmail(dto.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        String token = jwtUtil.generateToken(userDetails);

        return AuthResponseDTO.builder()
                .token(token)
                .userId(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .build();
    }

    public User getByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    public UserProfileDTO getProfile(String email) {
        User user = getByEmail(email);
        UserProfileDTO dto = new UserProfileDTO();
        dto.setId(user.getId());
        dto.setFullName(user.getFullName());
        dto.setEmail(user.getEmail());
        dto.setPhone(user.getPhone());
        dto.setCollege(user.getCollege());
        dto.setDepartment(user.getDepartment());
        return dto;
    }

    public UserProfileDTO updateProfile(String email, UserProfileDTO dto) {
        User user = getByEmail(email);
        user.setFullName(dto.getFullName());
        user.setPhone(dto.getPhone());
        user.setCollege(dto.getCollege());
        user.setDepartment(dto.getDepartment());
        userRepository.save(user);
        return getProfile(email);
    }
}
