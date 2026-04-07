package com.focuspet.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "pets")
public class Pet {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name = "Pöllö";

    @Enumerated(EnumType.STRING)
    private PetMood mood = PetMood.HAPPY;

    private int happiness = 70;

    private String accessories = ""; // JSON array stored as string: ["🎀", "👑"]

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    public enum PetMood {
        ECSTATIC, HAPPY, NEUTRAL, SAD
    }
}
