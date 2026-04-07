package com.focuspet.dto;

import com.focuspet.entity.Pet.PetMood;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PetDTO {
    private Long id;
    private String name;
    private PetMood mood;
    private int happiness;
    private String accessories;
}
