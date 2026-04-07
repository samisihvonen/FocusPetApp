package com.focuspet.dto;

import com.focuspet.entity.Task.TaskStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TaskDTO {
    private Long id;
    private String title;
    private TaskStatus status;
    private int totalXP;
    private int totalCoins;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;
    private List<StepDTO> steps;
}
