package com.focuspet.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class EmailLoginRequest {
    @NotBlank
    @Email
    private String email;

    @NotBlank
    private String password;
}