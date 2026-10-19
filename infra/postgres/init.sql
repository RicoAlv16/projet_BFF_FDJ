-- ==============================================================================
-- FDJ Parions Sport - Base de Données Transactionnelle PostgreSQL
-- Schéma Relationnel : Matchs, Marchés, Cotes, Tickets et Audit ANJ
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Table des Sports
CREATE TABLE IF NOT EXISTS sports (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    icon VARCHAR(32) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0
);

-- 2. Table des Compétitions
CREATE TABLE IF NOT EXISTS competitions (
    id VARCHAR(64) PRIMARY KEY,
    sport_id VARCHAR(32) NOT NULL REFERENCES sports(id),
    name VARCHAR(128) NOT NULL,
    country VARCHAR(64) NOT NULL,
    logo_url VARCHAR(255)
);

-- 3. Table des Matchs
CREATE TABLE IF NOT EXISTS matches (
    id VARCHAR(64) PRIMARY KEY,
    competition_id VARCHAR(64) NOT NULL REFERENCES competitions(id),
    home_team VARCHAR(128) NOT NULL,
    away_team VARCHAR(128) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PRE_MATCH', -- PRE_MATCH, LIVE, SUSPENDED, FINISHED, CANCELLED
    score_home INT DEFAULT 0,
    score_away INT DEFAULT 0,
    minute_elapsed INT DEFAULT 0,
    is_live BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Table des Marchés
CREATE TABLE IF NOT EXISTS markets (
    id VARCHAR(64) PRIMARY KEY,
    match_id VARCHAR(64) NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    market_type VARCHAR(64) NOT NULL, -- '1N2', 'OVER_UNDER_2_5', 'BOTH_TEAMS_SCORE'
    name VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN', -- OPEN, SUSPENDED, CLOSED, SETTLED
    display_order INT DEFAULT 0
);

-- 5. Table des Cotes (Odds)
CREATE TABLE IF NOT EXISTS odds (
    id VARCHAR(64) PRIMARY KEY,
    market_id VARCHAR(64) NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    selection_name VARCHAR(64) NOT NULL, -- '1', 'N', '2', 'Oui', 'Non', etc.
    current_value NUMERIC(6, 2) NOT NULL,
    previous_value NUMERIC(6, 2),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, SUSPENDED
    probability NUMERIC(5, 4),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Table des Tickets (PSEL & PSPDV)
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference VARCHAR(64) UNIQUE NOT NULL, -- Ex: FDJ-PSEL-2026-98124 ou FDJ-PSPDV-2026-44211
    channel VARCHAR(16) NOT NULL, -- 'PSEL' (En ligne) ou 'PSPDV' (Point de Vente)
    user_id VARCHAR(64), -- Nullable pour Point de Vente (ticket anonyme au départ)
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- PENDING, VALIDATED, WON, LOST, CANCELLED
    stake NUMERIC(10, 2) NOT NULL, -- Mise en Euros
    potential_win NUMERIC(10, 2) NOT NULL, -- Gain potentiel
    total_odds NUMERIC(8, 2) NOT NULL,
    qr_code_hash VARCHAR(255), -- Signature HMAC du ticket PSPDV
    terminal_id VARCHAR(64), -- Identifiant de la borne / bureau de tabac
    validated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Lignes de sélection d'un Ticket
CREATE TABLE IF NOT EXISTS ticket_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    match_id VARCHAR(64) NOT NULL REFERENCES matches(id),
    market_id VARCHAR(64) NOT NULL REFERENCES markets(id),
    odd_id VARCHAR(64) NOT NULL REFERENCES odds(id),
    selection_name VARCHAR(64) NOT NULL,
    odd_value NUMERIC(6, 2) NOT NULL,
    match_title VARCHAR(255) NOT NULL,
    market_name VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING'
);

-- 8. Table d'Audit Réglementaire ANJ
CREATE TABLE IF NOT EXISTS regulatory_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES tickets(id),
    event_type VARCHAR(64) NOT NULL, -- TICKET_CREATION, ODDS_CHECK, ANJ_LIMIT_VALIDATION
    payload JSONB NOT NULL,
    client_ip VARCHAR(45),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- Données Initiales de Référence
-- ==============================================================================

INSERT INTO sports (id, name, icon, display_order) VALUES
('football', 'Football', 'soccer-ball', 1),
('tennis', 'Tennis', 'tennis-ball', 2),
('basketball', 'Basketball', 'basketball', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO competitions (id, sport_id, name, country) VALUES
('ligue-1', 'football', 'Ligue 1 McDonald''s', 'France'),
('la-liga', 'football', 'La Liga EA Sports', 'Espagne'),
('premier-league', 'football', 'Premier League', 'Angleterre'),
('atp-masters', 'tennis', 'ATP Masters 1000', 'International')
ON CONFLICT (id) DO NOTHING;

-- Match Live : PSG vs Marseille (2-1 à la 65e minute)
INSERT INTO matches (id, competition_id, home_team, away_team, start_time, status, score_home, score_away, minute_elapsed, is_live) VALUES
('match-psg-om', 'ligue-1', 'Paris Saint-Germain', 'Olympique de Marseille', CURRENT_TIMESTAMP - INTERVAL '65 minutes', 'LIVE', 2, 1, 65, TRUE),
('match-real-barca', 'la-liga', 'Real Madrid', 'FC Barcelone', CURRENT_TIMESTAMP + INTERVAL '2 hours', 'PRE_MATCH', 0, 0, 0, FALSE),
('match-city-liverpool', 'premier-league', 'Manchester City', 'Liverpool', CURRENT_TIMESTAMP + INTERVAL '5 hours', 'PRE_MATCH', 0, 0, 0, FALSE),
('match-alcaraz-sinner', 'atp-masters', 'Carlos Alcaraz', 'Jannik Sinner', CURRENT_TIMESTAMP - INTERVAL '20 minutes', 'LIVE', 1, 0, 32, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Marchés PSG vs OM
INSERT INTO markets (id, match_id, market_type, name, status, display_order) VALUES
('mkt-psg-om-1n2', 'match-psg-om', '1N2', 'Résultat du Match (1N2)', 'OPEN', 1),
('mkt-psg-om-btts', 'match-psg-om', 'BOTH_TEAMS_SCORE', 'Les deux équipes marquent', 'OPEN', 2)
ON CONFLICT (id) DO NOTHING;

-- Cotes PSG vs OM
INSERT INTO odds (id, market_id, selection_name, current_value, previous_value, status, probability) VALUES
('odd-psg-win', 'mkt-psg-om-1n2', '1 (PSG)', 1.45, 1.80, 'ACTIVE', 0.6500),
('odd-psg-draw', 'mkt-psg-om-1n2', 'N (Nul)', 4.20, 3.80, 'ACTIVE', 0.2200),
('odd-om-win', 'mkt-psg-om-1n2', '2 (OM)', 6.50, 4.50, 'ACTIVE', 0.1300),
('odd-psg-btts-yes', 'mkt-psg-om-btts', 'Oui', 1.12, 1.65, 'ACTIVE', 0.8500),
('odd-psg-btts-no', 'mkt-psg-om-btts', 'Non', 5.50, 2.10, 'ACTIVE', 0.1500)
ON CONFLICT (id) DO NOTHING;

-- Marchés Real vs Barca
INSERT INTO markets (id, match_id, market_type, name, status, display_order) VALUES
('mkt-real-barca-1n2', 'match-real-barca', '1N2', 'Résultat du Match (1N2)', 'OPEN', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO odds (id, market_id, selection_name, current_value, previous_value, status, probability) VALUES
('odd-real-win', 'mkt-real-barca-1n2', '1 (Real Madrid)', 2.10, 2.15, 'ACTIVE', 0.4500),
('odd-barca-draw', 'mkt-real-barca-1n2', 'N (Nul)', 3.60, 3.50, 'ACTIVE', 0.2700),
('odd-barca-win', 'mkt-real-barca-1n2', '2 (Barcelone)', 3.10, 3.00, 'ACTIVE', 0.2800)
ON CONFLICT (id) DO NOTHING;
