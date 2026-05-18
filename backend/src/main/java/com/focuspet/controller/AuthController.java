package com.focuspet.controller;

import com.focuspet.dto.AuthResponse;
import com.focuspet.dto.EmailLoginRequest;
import com.focuspet.dto.EmailRegisterRequest;
import com.focuspet.dto.GoogleLoginRequest;
import com.focuspet.dto.UserDTO;
import com.focuspet.service.AuthService;
import com.focuspet.service.JwtService;
import io.jsonwebtoken.Claims;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;
    private final JwtService jwtService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody EmailRegisterRequest request) {
        return ResponseEntity.ok(authService.registerWithEmail(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody EmailLoginRequest request) {
        return ResponseEntity.ok(authService.loginWithEmail(request));
    }

    @PostMapping("/google")
    public ResponseEntity<AuthResponse> loginWithGoogle(@Valid @RequestBody GoogleLoginRequest request) {
        return ResponseEntity.ok(authService.loginWithGoogle(request.getIdToken()));
    }

    @GetMapping("/me")
    public ResponseEntity<UserDTO> me(
            @RequestHeader(name = "Authorization", required = false) String authorizationHeader) {
        String token = extractBearerToken(authorizationHeader);
        Claims claims = jwtService.validateAndParse(token);
        Long userId = Long.parseLong(claims.getSubject());
        return ResponseEntity.ok(authService.getProfileById(userId));
    }

    private String extractBearerToken(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            throw new ResponseStatusException(UNAUTHORIZED, "Missing bearer token");
        }
        return authorizationHeader.substring("Bearer ".length());
    }
}