package com.focuspet.controller;

import com.focuspet.dto.TaskDTO;
import com.focuspet.dto.StepDTO;
import com.focuspet.entity.Task;
import com.focuspet.entity.Step;
import com.focuspet.repository.TaskRepository;
import com.focuspet.repository.StepRepository;
import com.focuspet.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {
    private final TaskRepository taskRepository;
    private final StepRepository stepRepository;
    private final UserRepository userRepository;

    @GetMapping("/user/{userId}")
    public ResponseEntity<Object> getUserTasks(@PathVariable Long userId) {
        var tasks = taskRepository.findByUserId(userId)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(tasks);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TaskDTO> getTask(@PathVariable Long id) {
        return taskRepository.findById(id)
                .map(this::toDTO)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<TaskDTO> createTask(@RequestBody TaskDTO dto, @RequestParam Long userId) {
        return userRepository.findById(userId)
                .map(user -> {
                    Task task = new Task();
                    task.setTitle(dto.getTitle());
                    task.setStatus(Task.TaskStatus.IDLE);
                    task.setUser(user);
                    Task saved = taskRepository.save(task);
                    return ResponseEntity.status(HttpStatus.CREATED).body(toDTO(saved));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/complete")
    public ResponseEntity<TaskDTO> completeTask(@PathVariable Long id) {
        return taskRepository.findById(id)
                .map(task -> {
                    task.setStatus(Task.TaskStatus.COMPLETED);
                    task.setCompletedAt(LocalDateTime.now());
                    Task updated = taskRepository.save(task);
                    return ResponseEntity.ok(toDTO(updated));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(@PathVariable Long id) {
        if (taskRepository.existsById(id)) {
            taskRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

    private TaskDTO toDTO(Task task) {
        TaskDTO dto = new TaskDTO();
        dto.setId(task.getId());
        dto.setTitle(task.getTitle());
        dto.setStatus(task.getStatus());
        dto.setTotalXP(task.getTotalXP());
        dto.setTotalCoins(task.getTotalCoins());
        dto.setCreatedAt(task.getCreatedAt());
        dto.setCompletedAt(task.getCompletedAt());
        dto.setSteps(task.getSteps().stream()
                .map(this::stepToDTO)
                .collect(Collectors.toList()));
        return dto;
    }

    private StepDTO stepToDTO(Step step) {
        StepDTO dto = new StepDTO();
        dto.setId(step.getId());
        dto.setStepOrder(step.getStepOrder());
        dto.setEmoji(step.getEmoji());
        dto.setDescription(step.getDescription());
        dto.setDone(step.isDone());
        dto.setXpReward(step.getXpReward());
        dto.setCoinReward(step.getCoinReward());
        return dto;
    }
}
