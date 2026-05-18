package com.focuspet.service;

import com.focuspet.dto.AuthResponse;
import com.focuspet.dto.EmailLoginRequest;
import com.focuspet.dto.EmailRegisterRequest;
import com.focuspet.dto.UserDTO;
import com.focuspet.entity.User;
import com.focuspet.repository.UserRepository;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.jackson2.JacksonFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.text.Normalizer;
import java.util.Collections;
import java.util.Locale;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository userRepository;
    private final JwtService jwtService;
    // private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Value("${app.auth.google-client-id:}")
    private String googleClientId;

    public AuthResponse registerWithEmail(EmailRegisterRequest request) {
        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
        }

        User user = new User();
        user.setUsername(buildUniqueUsername(request.getUsername()));
        user.setEmail(email);
        user.setAuthProvider(User.AuthProvider.LOCAL);
        // user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setPasswordHash(request.getPassword()); // TODO: Re-enable password encoding

        User saved = userRepository.save(user);
        return toAuthResponse(saved);
    }

    public AuthResponse loginWithEmail(EmailLoginRequest request) {
        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (user.getPasswordHash() == null || user.getPasswordHash().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "This account does not support email password login");
        }

        // TODO: Re-enable password matching
        // if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
        //     throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        // }
        if (!request.getPassword().equals(user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        return toAuthResponse(user);
    }

    public AuthResponse loginWithGoogle(String idTokenString) {
        GoogleIdToken idToken = verifyGoogleToken(idTokenString);
        GoogleIdToken.Payload payload = idToken.getPayload();

        String email = Optional.ofNullable(payload.getEmail())
                .map(v -> v.trim().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Google token missing email"));

        Boolean verified = payload.getEmailVerified();
        if (verified == null || !verified) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Google email is not verified");
        }

        String googleId = payload.getSubject();
        String name = Optional.ofNullable((String) payload.get("name")).orElse("FocusPet User");
        String picture = Optional.ofNullable((String) payload.get("picture")).orElse(null);

        User user = userRepository.findByGoogleId(googleId)
                .or(() -> userRepository.findByEmail(email))
                .orElseGet(User::new);

        if (user.getId() == null) {
            user.setUsername(buildUniqueUsername(name));
            user.setEmail(email);
        }

        user.setAuthProvider(User.AuthProvider.GOOGLE);
        user.setGoogleId(googleId);
        user.setAvatarUrl(picture);

        User saved = userRepository.save(user);
        return toAuthResponse(saved);
    }

    public UserDTO getProfileById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
        return toDTO(user);
    }

    private GoogleIdToken verifyGoogleToken(String idTokenString) {
        try {
            GoogleIdTokenVerifier.Builder builder = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(),
                    JacksonFactory.getDefaultInstance());

            if (!googleClientId.isBlank()) {
                builder.setAudience(Collections.singletonList(googleClientId));
            }

            GoogleIdTokenVerifier verifier = builder.build();
            GoogleIdToken idToken = verifier.verify(idTokenString);

            if (idToken == null) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Google token");
            }

            return idToken;
        } catch (GeneralSecurityException | IOException | IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Google token verification failed", ex);
        }
    }

    private AuthResponse toAuthResponse(User user) {
        return new AuthResponse(jwtService.generateToken(user), toDTO(user));
    }

    private UserDTO toDTO(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setAuthProvider(user.getAuthProvider());
        dto.setCoins(user.getCoins());
        dto.setXp(user.getXp());
        dto.setLevel(user.getLevel());
        dto.setStreakDays(user.getStreakDays());
        dto.setLastActiveDate(user.getLastActiveDate());
        return dto;
    }

    private String buildUniqueUsername(String source) {
        String normalized = Normalizer.normalize(source, Normalizer.Form.NFD)
                .replaceAll("[^\\p{ASCII}]", "")
                .replaceAll("[^a-zA-Z0-9._-]", "")
                .trim();

        if (normalized.isBlank()) {
            normalized = "focuspet_user";
        }

        String candidate = normalized;
        int suffix = 1;
        while (userRepository.findByUsername(candidate).isPresent()) {
            candidate = normalized + suffix;
            suffix++;
        }

        return candidate;
    }
}
