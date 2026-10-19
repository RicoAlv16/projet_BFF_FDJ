package com.fdj.backend_java.domain;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "odds")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Odd {

    @Id
    @Column(length = 64)
    private String id; // Ex: "odd-psg-win"

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "market_id", nullable = false)
    @JsonBackReference
    private Market market;

    @Column(name = "selection_name", nullable = false, length = 64)
    private String selectionName; // "1 (PSG)", "N (Nul)", "2 (OM)"

    @Column(name = "current_value", nullable = false, precision = 6, scale = 2)
    private BigDecimal currentValue;

    @Column(name = "previous_value", precision = 6, scale = 2)
    private BigDecimal previousValue;

    @Column(nullable = false, length = 32)
    private String status; // "ACTIVE", "SUSPENDED"

    @Column(precision = 5, scale = 4)
    private BigDecimal probability;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
