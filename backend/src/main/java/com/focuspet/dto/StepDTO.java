package com.focuspet.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StepDTO {
    private Long id;
    private int stepOrder;
    private String emoji;
    private String description;
    private boolean isDone;
    private int xpReward;
    private int coinReward;
}
