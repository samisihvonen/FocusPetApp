package com.focuspet.controller;

import com.focuspet.dto.UserDTO;
import com.focuspet.entity.User;
import com.focuspet.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    private final UserRepository userRepository;

    @GetMapping("/{id}")
    public ResponseEntity<UserDTO> getUser(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(this::toDTO)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<UserDTO> createUser(@RequestBody UserDTO dto) {
        User user = new User();
        user.setUsername(dto.getUsername());
        user.setEmail(dto.getEmail());
        User saved = userRepository.save(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(toDTO(saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserDTO> updateUser(
            @PathVariable Long id,
            @RequestBody UserDTO dto) {
        return userRepository.findById(id)
                .map(user -> {
                    user.setUsername(dto.getUsername());
                    user.setEmail(dto.getEmail());
                    user.setCoins(dto.getCoins());
                    user.setXp(dto.getXp());
                    user.setLevel(dto.getLevel());
                    user.setStreakDays(dto.getStreakDays());
                    User updated = userRepository.save(user);
                    return ResponseEntity.ok(toDTO(updated));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/stats")
    public ResponseEntity<Object> getUserStats(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(user -> ResponseEntity.ok((Object) new Object() {
                    public int coins = user.getCoins();
                    public int xp = user.getXp();
                    public int level = user.getLevel();
                    public int streakDays = user.getStreakDays();
                }))
                .orElse(ResponseEntity.notFound().build());
    }

    private UserDTO toDTO(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setCoins(user.getCoins());
        dto.setXp(user.getXp());
        dto.setLevel(user.getLevel());
        dto.setStreakDays(user.getStreakDays());
        dto.setLastActiveDate(user.getLastActiveDate());
        return dto;
    }
}
