package com.fdj.backend_java.repository;

import com.fdj.backend_java.domain.SportMatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MatchRepository extends JpaRepository<SportMatch, String> {

    // Récupérer tous les matchs en direct
    List<SportMatch> findByIsLiveTrue();

    // Récupérer un match complet (avec marchés et cotes) en 1 seule requête SQL
    // optimisée
    @Query("SELECT DISTINCT m FROM SportMatch m " +
            "LEFT JOIN FETCH m.markets mk " +
            "LEFT JOIN FETCH mk.odds " +
            "WHERE m.id = :id")
    Optional<SportMatch> findByIdWithDetails(@Param("id") String id);

    // Récupérer tous les matchs en live complets
    @Query("SELECT DISTINCT m FROM SportMatch m " +
            "LEFT JOIN FETCH m.markets mk " +
            "LEFT JOIN FETCH mk.odds " +
            "WHERE m.isLive = true")
    List<SportMatch> findAllLiveWithDetails();
}
