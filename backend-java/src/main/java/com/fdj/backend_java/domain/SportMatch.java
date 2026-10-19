package com.fdj.backend_java.domain;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "matches")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class SportMatch {

    @Id
    @Column(length = 64)
    private String id;

    @Column(name = "competition_id", nullable = false, length = 64)
    private String competitionId;

    @Column(name = "home_team", nullable = false, length = 128)
    private String homeTeam;

    @Column(name = "away_team", nullable = false, length = 128)
    private String awayTeam;

    @Column(name = "start_time", nullable = false)
    private OffsetDateTime startTime;

    @Column(nullable = false, length = 32)
    private String status;

    @Column(name = "score_home")
    private Integer scoreHome;

    @Column(name = "score_away")
    private Integer scoreAway;

    @Column(name = "minute_elapsed")
    private Integer minuteElapsed;

    @Column(name = "is_live")
    private Boolean isLive;

    @OneToMany(mappedBy = "match", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonManagedReference
    @Builder.Default
    private Set<Market> markets = new LinkedHashSet<>();
}
