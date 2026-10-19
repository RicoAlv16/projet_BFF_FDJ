package com.fdj.backend_java.kafka.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OddsUpdatedEvent {
    private String matchId;
    private String marketId;
    private String oddId;
    private String selectionName;
    private BigDecimal previousValue;
    private BigDecimal currentValue;
    private String status; // "ACTIVE", "SUSPENDED"
    private Instant timestamp;
}
