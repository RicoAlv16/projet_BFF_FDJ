package com.fdj.backend_java.domain;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;

import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "markets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class Market {

    @Id
    @Column(length = 64)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "match_id", nullable = false)
    @JsonBackReference
    private SportMatch match;

    @Column(name = "market_type", nullable = false, length = 64)
    private String marketType;

    @Column(nullable = false, length = 128)
    private String name;

    @Column(nullable = false, length = 32)
    private String status;

    @Column(name = "display_order")
    private Integer displayOrder;

    @OneToMany(mappedBy = "market", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @JsonManagedReference
    @Builder.Default
    private Set<Odd> odds = new LinkedHashSet<>();
}
