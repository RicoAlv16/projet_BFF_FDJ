package com.fdj.backend_java.repository;

import com.fdj.backend_java.domain.Odd;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OddRepository extends JpaRepository<Odd, String> {

    List<Odd> findByMarketId(String marketId);
}
