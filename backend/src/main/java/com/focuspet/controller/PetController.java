package com.focuspet.controller;

import com.focuspet.dto.PetDTO;
import com.focuspet.entity.Pet;
import com.focuspet.repository.PetRepository;
import com.focuspet.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/pets")
@RequiredArgsConstructor
public class PetController {
    private final PetRepository petRepository;
    private final UserRepository userRepository;

    @GetMapping("/user/{userId}")
    public ResponseEntity<PetDTO> getPetByUserId(@PathVariable Long userId) {
        return petRepository.findByUserId(userId)
                .map(this::toDTO)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{petId}/happiness")
    public ResponseEntity<PetDTO> updateHappiness(
            @PathVariable Long petId,
            @RequestParam int delta) {
        return petRepository.findById(petId)
                .map(pet -> {
                    int newHappiness = Math.max(0, Math.min(100, pet.getHappiness() + delta));
                    pet.setHappiness(newHappiness);

                    // Update mood based on happiness
                    if (newHappiness >= 80) {
                        pet.setMood(Pet.PetMood.ECSTATIC);
                    } else if (newHappiness >= 55) {
                        pet.setMood(Pet.PetMood.HAPPY);
                    } else if (newHappiness >= 30) {
                        pet.setMood(Pet.PetMood.NEUTRAL);
                    } else {
                        pet.setMood(Pet.PetMood.SAD);
                    }

                    Pet updated = petRepository.save(pet);
                    return ResponseEntity.ok(toDTO(updated));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    private PetDTO toDTO(Pet pet) {
        PetDTO dto = new PetDTO();
        dto.setId(pet.getId());
        dto.setName(pet.getName());
        dto.setMood(pet.getMood());
        dto.setHappiness(pet.getHappiness());
        dto.setAccessories(pet.getAccessories());
        return dto;
    }
}
