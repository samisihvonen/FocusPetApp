package com.focuspet.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserDTO {
    private Long id;
    private String username;
    private String email;
    private int coins;
    private int xp;
    private int level;
    private int streakDays;
    private LocalDateTime lastActiveDate;
    private PetDTO pet;
}
