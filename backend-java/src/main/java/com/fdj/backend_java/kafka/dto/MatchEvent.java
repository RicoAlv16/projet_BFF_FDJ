package com.fdj.backend_java.kafka.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchEvent {
    private String matchId;
    private String eventType; // "GOAL", "VAR_REVIEW", "STATUS_CHANGE", "MINUTE_TICK"
    private Integer scoreHome;
    private Integer scoreAway;
    private Integer minuteElapsed;
    private String description;
    private Instant timestamp;
}
