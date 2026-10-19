package com.fdj.backend_java.web;

import com.fdj.backend_java.domain.SportMatch;
import com.fdj.backend_java.repository.MatchRepository;
import com.fdj.backend_java.service.LiveOddsSimulationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/matches")
@CrossOrigin(origins = "*")
public class MatchRestController {

    private final MatchRepository matchRepository;
    private final LiveOddsSimulationService simulationService;

    public MatchRestController(MatchRepository matchRepository,
            LiveOddsSimulationService simulationService) {
        this.matchRepository = matchRepository;
        this.simulationService = simulationService;
    }

    /**
     * Récupère tous les matchs en direct avec leurs marchés et cotes
     */
    @GetMapping("/live")
    public ResponseEntity<List<SportMatch>> getLiveMatches() {
        return ResponseEntity.ok(matchRepository.findAllLiveWithDetails());
    }

    /**
     * Récupère un match précis par son identifiant
     */
    @GetMapping("/{id}")
    public ResponseEntity<SportMatch> getMatchById(@PathVariable String id) {
        return matchRepository.findByIdWithDetails(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Endpoint de test : déclenche manuellement un but sur un match
     */
    @PostMapping("/{id}/trigger-goal")
    public ResponseEntity<Map<String, String>> triggerGoal(
            @PathVariable String id,
            @RequestParam(defaultValue = "HOME") String team) {
        simulationService.triggerGoal(id, team);
        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "message", "But simulé avec succès pour l'équipe " + team + " sur le match " + id));
    }
}
