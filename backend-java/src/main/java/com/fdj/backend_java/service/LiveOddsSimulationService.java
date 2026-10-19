package com.fdj.backend_java.service;

import com.fdj.backend_java.domain.Market;
import com.fdj.backend_java.domain.Odd;
import com.fdj.backend_java.domain.SportMatch;
import com.fdj.backend_java.kafka.OddsKafkaProducer;
import com.fdj.backend_java.kafka.dto.MatchEvent;
import com.fdj.backend_java.kafka.dto.OddsUpdatedEvent;
import com.fdj.backend_java.repository.MatchRepository;
import com.fdj.backend_java.repository.OddRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Random;

@Service
public class LiveOddsSimulationService {

    private static final Logger log = LoggerFactory.getLogger(LiveOddsSimulationService.class);

    private final MatchRepository matchRepository;
    private final OddRepository oddRepository;
    private final OddsKafkaProducer kafkaProducer;
    private final Random random = new Random();

    @Value("${app.simulation.enabled:true}")
    private boolean simulationEnabled;

    public LiveOddsSimulationService(MatchRepository matchRepository,
            OddRepository oddRepository,
            OddsKafkaProducer kafkaProducer) {
        this.matchRepository = matchRepository;
        this.oddRepository = oddRepository;
        this.kafkaProducer = kafkaProducer;
    }

    /**
     * Boucle temporelle exécutée toutes les X millisecondes (défini dans
     * application.yml)
     */
    @Scheduled(fixedRateString = "${app.simulation.interval-ms:4000}")
    @Transactional
    public void simulateLiveOddsTick() {
        if (!simulationEnabled) {
            return;
        }

        List<SportMatch> liveMatches = matchRepository.findAllLiveWithDetails();
        for (SportMatch match : liveMatches) {
            // 1. Incrémenter la minute de jeu
            if (match.getMinuteElapsed() != null && match.getMinuteElapsed() < 90) {
                match.setMinuteElapsed(match.getMinuteElapsed() + 1);
            }

            // 2. Faire fluctuer légèrement les cotes 1N2
            for (Market market : match.getMarkets()) {
                if ("OPEN".equals(market.getStatus())) {
                    for (Odd odd : market.getOdds()) {
                        if ("ACTIVE".equals(odd.getStatus())) {
                            adjustOddFluctuation(match, odd);
                        }
                    }
                }
            }
            matchRepository.save(match);
        }
    }

    /**
     * Déclenche un BUT manuel (idéal pour tester le flux temps réel depuis l'API ou
     * le BFF)
     */
    @Transactional
    public void triggerGoal(String matchId, String scoringTeam) {
        SportMatch match = matchRepository.findByIdWithDetails(matchId)
                .orElseThrow(() -> new IllegalArgumentException("Match introuvable: " + matchId));

        // 1. Mettre à jour le score
        if ("HOME".equalsIgnoreCase(scoringTeam)) {
            match.setScoreHome(match.getScoreHome() + 1);
        } else {
            match.setScoreAway(match.getScoreAway() + 1);
        }

        // 2. Notifier l'événement de match (BUT !) sur Kafka
        MatchEvent goalEvent = MatchEvent.builder()
                .matchId(match.getId())
                .eventType("GOAL")
                .scoreHome(match.getScoreHome())
                .scoreAway(match.getScoreAway())
                .minuteElapsed(match.getMinuteElapsed())
                .description("BUT pour "
                        + ("HOME".equalsIgnoreCase(scoringTeam) ? match.getHomeTeam() : match.getAwayTeam()) + " !")
                .timestamp(Instant.now())
                .build();
        kafkaProducer.sendMatchEvent(goalEvent);

        // 3. Réajustement fort des cotes suite au but
        for (Market market : match.getMarkets()) {
            for (Odd odd : market.getOdds()) {
                recalculateOddsAfterGoal(match, odd, scoringTeam);
            }
        }

        matchRepository.save(match);
        log.info("⚽ [GOAL TRIGGERED] Match {}: {}-{}", match.getId(), match.getScoreHome(), match.getScoreAway());
    }

    private void adjustOddFluctuation(SportMatch match, Odd odd) {
        BigDecimal oldVal = odd.getCurrentValue();
        // Petite variation aléatoire entre -0.05 et +0.05
        double delta = (random.nextInt(11) - 5) / 100.0;
        BigDecimal newVal = oldVal.add(BigDecimal.valueOf(delta)).setScale(2, RoundingMode.HALF_UP);

        // Garder une cote minimale de 1.05
        if (newVal.compareTo(new BigDecimal("1.05")) < 0) {
            newVal = new BigDecimal("1.05");
        }

        if (newVal.compareTo(oldVal) != 0) {
            odd.setPreviousValue(oldVal);
            odd.setCurrentValue(newVal);
            odd.setUpdatedAt(OffsetDateTime.now());
            oddRepository.save(odd);

            // Diffusion immédiate dans Kafka !
            OddsUpdatedEvent event = OddsUpdatedEvent.builder()
                    .matchId(match.getId())
                    .marketId(odd.getMarket().getId())
                    .oddId(odd.getId())
                    .selectionName(odd.getSelectionName())
                    .previousValue(oldVal)
                    .currentValue(newVal)
                    .status(odd.getStatus())
                    .timestamp(Instant.now())
                    .build();
            kafkaProducer.sendOddsUpdated(event);
        }
    }

    private void recalculateOddsAfterGoal(SportMatch match, Odd odd, String scoringTeam) {
        BigDecimal oldVal = odd.getCurrentValue();
        BigDecimal newVal = oldVal;

        if ("odd-psg-win".equals(odd.getId())) {
            newVal = "HOME".equalsIgnoreCase(scoringTeam) ? new BigDecimal("1.18") : new BigDecimal("2.40");
        } else if ("odd-om-win".equals(odd.getId())) {
            newVal = "HOME".equalsIgnoreCase(scoringTeam) ? new BigDecimal("9.50") : new BigDecimal("2.90");
        } else if ("odd-psg-draw".equals(odd.getId())) {
            newVal = new BigDecimal("4.80");
        }

        odd.setPreviousValue(oldVal);
        odd.setCurrentValue(newVal);
        odd.setUpdatedAt(OffsetDateTime.now());
        oddRepository.save(odd);

        OddsUpdatedEvent event = OddsUpdatedEvent.builder()
                .matchId(match.getId())
                .marketId(odd.getMarket().getId())
                .oddId(odd.getId())
                .selectionName(odd.getSelectionName())
                .previousValue(oldVal)
                .currentValue(newVal)
                .status(odd.getStatus())
                .timestamp(Instant.now())
                .build();
        kafkaProducer.sendOddsUpdated(event);
    }
}
