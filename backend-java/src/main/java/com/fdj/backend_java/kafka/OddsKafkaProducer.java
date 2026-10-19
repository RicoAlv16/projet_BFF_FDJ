package com.fdj.backend_java.kafka;

import com.fdj.backend_java.kafka.dto.MatchEvent;
import com.fdj.backend_java.kafka.dto.OddsUpdatedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
public class OddsKafkaProducer {

    private static final Logger log = LoggerFactory.getLogger(OddsKafkaProducer.class);

    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${app.kafka.topics.odds-updated}")
    private String oddsUpdatedTopic;

    @Value("${app.kafka.topics.match-events}")
    private String matchEventsTopic;

    public OddsKafkaProducer(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void sendOddsUpdated(OddsUpdatedEvent event) {
        log.info("📢 [KAFKA] Émission de cote sur {}: match={} | {}={}",
                oddsUpdatedTopic, event.getMatchId(), event.getSelectionName(), event.getCurrentValue());
        // On utilise matchId comme clé de partition pour garantir l'ordre des messages
        // par match
        kafkaTemplate.send(oddsUpdatedTopic, event.getMatchId(), event);
    }

    public void sendMatchEvent(MatchEvent event) {
        log.info("⚡ [KAFKA] Émission d'événement match sur {}: match={} | type={}",
                matchEventsTopic, event.getMatchId(), event.getEventType());
        kafkaTemplate.send(matchEventsTopic, event.getMatchId(), event);
    }
}
