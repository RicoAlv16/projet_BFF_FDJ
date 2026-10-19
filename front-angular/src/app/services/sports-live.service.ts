import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { io, Socket } from 'socket.io-client';
import {
  SportMatch,
  Odd,
  OddUpdatedPayload,
  MatchEventPayload,
  TelemetryLog,
  BetSelection,
} from '../models/sports.model';

@Injectable({
  providedIn: 'root',
})
export class SportsLiveService {
  private readonly http = inject(HttpClient);

  // Configuration endpoints
  readonly bffUrl = signal<string>('http://localhost:3001');
  readonly javaEngineUrl = signal<string>('http://localhost:8081');

  // WebSocket
  private socket: Socket | null = null;
  readonly wsConnected = signal<boolean>(false);
  readonly wsConnecting = signal<boolean>(false);
  readonly wsLatency = signal<number>(8);
  readonly eventCount = signal<number>(0);
  readonly lastEventTimestamp = signal<Date | null>(null);

  // Live Sports Data Signals
  readonly matches = signal<SportMatch[]>([]);
  readonly selectedMatchId = signal<string>('match-psg-om');
  readonly matchEvents = signal<MatchEventPayload[]>([]);
  readonly telemetryLogs = signal<TelemetryLog[]>([]);
  readonly betSelections = signal<BetSelection[]>([]);
  readonly isSimulationRunning = signal<boolean>(false);
  readonly lastGoalBanner = signal<MatchEventPayload | null>(null);

  // Computed Current Match
  readonly currentMatch = computed(() => {
    const list = this.matches();
    const id = this.selectedMatchId();
    return list.find((m) => m.id === id) || list[0] || null;
  });

  // Betting Slip Computations
  readonly totalOdds = computed(() => {
    const items = this.betSelections();
    if (items.length === 0) return 1.0;
    return Number(items.reduce((acc, curr) => acc * curr.oddValue, 1.0).toFixed(2));
  });

  private simulationInterval: any = null;

  constructor() {
    this.initDefaultMockData();
    this.fetchLiveMatchesFromBFF();
    this.connectWebSocket();
    this.addTelemetryLog(
      'SYSTEM',
      'ANGULAR',
      'Plateforme d\'observabilité FDJ Parions Sport initialisée',
      { targetNamespace: '/live', cluster: 'fdj-local-cluster' }
    );
  }

  // ============================================================================
  // 1. Connexion WebSocket (BFF Gateway Socket.IO /live)
  // ============================================================================
  connectWebSocket(customUrl?: string) {
    if (customUrl) {
      this.bffUrl.set(customUrl);
    }

    if (this.socket) {
      this.socket.disconnect();
    }

    this.wsConnecting.set(true);

    try {
      const url = `${this.bffUrl()}/live`;
      this.socket = io(url, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        timeout: 5000,
      });

      this.socket.on('connect', () => {
        this.wsConnected.set(true);
        this.wsConnecting.set(false);
        this.wsLatency.set(Math.floor(Math.random() * 8) + 4);
        this.addTelemetryLog(
          'SYSTEM',
          'BFF_NEST',
          `Connecté au Gateway Socket.IO (/live) [Socket ID: ${this.socket?.id}]`,
          { socketId: this.socket?.id, url }
        );

        // Rejoindre automatiquement la room du match sélectionné
        this.joinMatchRoom(this.selectedMatchId());
      });

      this.socket.on('disconnect', (reason) => {
        this.wsConnected.set(false);
        this.wsConnecting.set(false);
        this.addTelemetryLog(
          'SYSTEM',
          'BFF_NEST',
          `Déconnexion du Gateway WebSocket: ${reason}`,
          { reason }
        );
      });

      this.socket.on('connect_error', (error) => {
        this.wsConnecting.set(false);
        this.wsConnected.set(false);
        // Note: Si le BFF n'est pas encore démarré, le front continue de fonctionner en mode autonome
      });

      // Écoute du canal des cotes en direct (sports.odds.updated)
      this.socket.on('odd_updated', (data: OddUpdatedPayload) => {
        this.handleOddUpdated(data, 'BFF_NEST');
      });

      // Écoute des événements de match (sports.match.events)
      this.socket.on('match_event', (event: MatchEventPayload) => {
        this.handleMatchEvent(event, 'BFF_NEST');
      });

      this.socket.on('joined_match', (info: any) => {
        this.addTelemetryLog('SYSTEM', 'BFF_NEST', `Room rejointe: ${info.room}`, info);
      });
    } catch (err) {
      this.wsConnecting.set(false);
      this.wsConnected.set(false);
    }
  }

  joinMatchRoom(matchId: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('join_match', matchId);
    }
  }

  leaveMatchRoom(matchId: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('leave_match', matchId);
    }
  }

  selectMatch(matchId: string) {
    const prev = this.selectedMatchId();
    if (prev && prev !== matchId) {
      this.leaveMatchRoom(prev);
    }
    this.selectedMatchId.set(matchId);
    this.joinMatchRoom(matchId);
    this.addTelemetryLog('USER_ACTION', 'ANGULAR', `Sélection du match: ${matchId}`, { matchId });
  }

  // ============================================================================
  // 2. Traitement réactif des Cotes Kafka -> Worker -> Redis -> BFF
  // ============================================================================
  handleOddUpdated(payload: OddUpdatedPayload, source: 'BFF_NEST' | 'KAFKA' | 'WORKER_NEST' = 'BFF_NEST') {
    this.eventCount.update((c) => c + 1);
    this.lastEventTimestamp.set(new Date());

    const delta = payload.previousValue ? Number((payload.currentValue - payload.previousValue).toFixed(2)) : 0;
    const direction: 'up' | 'down' | null = delta > 0 ? 'up' : delta < 0 ? 'down' : null;

    // Mise à jour de la cote dans le match correspondant
    this.matches.update((currentMatches) => {
      return currentMatches.map((m) => {
        if (m.id !== payload.matchId) return m;

        const updatedMarkets = m.markets.map((market) => {
          const updatedOdds = market.odds.map((odd) => {
            if (odd.id === payload.oddId) {
              return {
                ...odd,
                previousValue: odd.currentValue,
                currentValue: Number(payload.currentValue.toFixed(2)),
                status: payload.status || odd.status,
                isLiveHot: true,
                lastUpdateTimestamp: payload.timestamp || Date.now(),
                flashState: direction,
              };
            }
            return odd;
          });
          return { ...market, odds: updatedOdds };
        });

        return { ...m, markets: updatedMarkets };
      });
    });

    // Mettre à jour aussi le ticket de paris si la cote y est présente
    this.betSelections.update((selections) => {
      return selections.map((sel) => {
        if (sel.matchId === payload.matchId && sel.oddId === payload.oddId) {
          return {
            ...sel,
            oddValue: Number(payload.currentValue.toFixed(2)),
            hasChanged: true,
          };
        }
        return sel;
      });
    });

    // Retirer l'effet de flash après 1.5s
    setTimeout(() => {
      this.clearOddFlash(payload.matchId, payload.oddId);
    }, 1500);

    // Journalisation télémétrique
    const deltaStr = delta > 0 ? `+${delta}` : `${delta}`;
    this.addTelemetryLog(
      'ODD_UPDATE',
      source,
      `[Kafka Stream ➔ Redis ➔ WS] Cote mise à jour: ${payload.selectionName} = ${payload.currentValue} (${deltaStr})`,
      payload,
      payload.matchId
    );
  }

  private clearOddFlash(matchId: string, oddId: string) {
    this.matches.update((list) =>
      list.map((m) => {
        if (m.id !== matchId) return m;
        return {
          ...m,
          markets: m.markets.map((mkt) => ({
            ...mkt,
            odds: mkt.odds.map((o) => (o.id === oddId ? { ...o, flashState: null } : o)),
          })),
        };
      })
    );
  }

  // ============================================================================
  // 3. Traitement des Événements de Match (But, VAR, Cartons)
  // ============================================================================
  handleMatchEvent(event: MatchEventPayload, source: 'BFF_NEST' | 'KAFKA' | 'WORKER_NEST' = 'BFF_NEST') {
    this.eventCount.update((c) => c + 1);
    this.lastEventTimestamp.set(new Date());

    // Ajout en tête du flux d'événements
    this.matchEvents.update((events) => [event, ...events.slice(0, 49)]);

    // Si but, bandeau d'alerte spécial avec auto-dissimulation
    if (event.eventType === 'GOAL') {
      this.lastGoalBanner.set(event);
      setTimeout(() => {
        this.lastGoalBanner.set(null);
      }, 6000);
    }

    // Mise à jour du score du match
    this.matches.update((list) =>
      list.map((m) => {
        if (m.id === event.matchId) {
          return {
            ...m,
            scoreHome: event.scoreHome,
            scoreAway: event.scoreAway,
            minuteElapsed: event.minute || m.minuteElapsed,
          };
        }
        return m;
      })
    );

    this.addTelemetryLog(
      'MATCH_EVENT',
      source,
      `⚡ [Événement Kafka] ${event.eventType} sur ${event.matchId}: ${event.description} (Score: ${event.scoreHome}-${event.scoreAway})`,
      event,
      event.matchId
    );
  }

  // ============================================================================
  // 4. Déclenchement Simulation (Appel Java Core ou Simulation Locale)
  // ============================================================================
  async triggerGoal(matchId: string, team: 'HOME' | 'AWAY') {
    this.addTelemetryLog('USER_ACTION', 'ANGULAR', `Déclenchement test BUT pour l'équipe ${team} (${matchId})`, {
      matchId,
      team,
    });

    const targetUrl = `${this.javaEngineUrl()}/api/v1/matches/${matchId}/trigger-goal?team=${team}`;

    try {
      await this.http.post(targetUrl, {}).toPromise();
      this.addTelemetryLog('MATCH_EVENT', 'JAVA_CORE', `But accepté par le Core Java REST. Événement poussé dans Kafka topic 'sports.match.events'`, {
        status: 'SUCCESS',
      });
    } catch {
      // Si le backend Java n'est pas actif dans un terminal, on simule l'impact immédiat dans le front !
      this.simulateLocalGoal(matchId, team);
    }
  }

  private simulateLocalGoal(matchId: string, team: 'HOME' | 'AWAY') {
    const match = this.matches().find((m) => m.id === matchId);
    if (!match) return;

    const newHome = team === 'HOME' ? match.scoreHome + 1 : match.scoreHome;
    const newAway = team === 'AWAY' ? match.scoreAway + 1 : match.scoreAway;
    const scoringTeamName = team === 'HOME' ? match.homeTeam : match.awayTeam;

    const event: MatchEventPayload = {
      matchId,
      eventType: 'GOAL',
      description: `BUT DE ${scoringTeamName.toUpperCase()} ! (${scoringTeamName})`,
      scoreHome: newHome,
      scoreAway: newAway,
      minute: Math.min(90, match.minuteElapsed + Math.floor(Math.random() * 5) + 1),
      timestamp: Date.now(),
    };

    // 1. Événement de But
    this.handleMatchEvent(event, 'KAFKA');

    // 2. Fluctuation immédiate des cotes 1N2 après le but
    setTimeout(() => {
      const psgOdd = match.markets.find((mkt) => mkt.marketType === '1N2')?.odds.find((o) => o.id === 'odd-psg-win');
      const omOdd = match.markets.find((mkt) => mkt.marketType === '1N2')?.odds.find((o) => o.id === 'odd-om-win');
      const drawOdd = match.markets.find((mkt) => mkt.marketType === '1N2')?.odds.find((o) => o.id === 'odd-psg-draw');

      if (team === 'HOME' && psgOdd) {
        this.handleOddUpdated({
          matchId,
          oddId: psgOdd.id,
          selectionName: psgOdd.selectionName,
          currentValue: Math.max(1.05, Number((psgOdd.currentValue * 0.75).toFixed(2))),
          previousValue: psgOdd.currentValue,
          status: 'ACTIVE',
          timestamp: Date.now(),
        }, 'WORKER_NEST');
      }

      if (team === 'HOME' && omOdd) {
        this.handleOddUpdated({
          matchId,
          oddId: omOdd.id,
          selectionName: omOdd.selectionName,
          currentValue: Number((omOdd.currentValue * 1.6).toFixed(2)),
          previousValue: omOdd.currentValue,
          status: 'ACTIVE',
          timestamp: Date.now(),
        }, 'WORKER_NEST');
      }

      if (drawOdd) {
        this.handleOddUpdated({
          matchId,
          oddId: drawOdd.id,
          selectionName: drawOdd.selectionName,
          currentValue: Number((drawOdd.currentValue * 1.15).toFixed(2)),
          previousValue: drawOdd.currentValue,
          status: 'ACTIVE',
          timestamp: Date.now(),
        }, 'WORKER_NEST');
      }
    }, 800);
  }

  // ============================================================================
  // 5. Simulateur Aléatoire Continu (Streaming Kafka Démo)
  // ============================================================================
  toggleContinuousSimulation() {
    if (this.isSimulationRunning()) {
      this.stopContinuousSimulation();
    } else {
      this.startContinuousSimulation();
    }
  }

  startContinuousSimulation() {
    this.isSimulationRunning.set(true);
    this.addTelemetryLog('SYSTEM', 'ANGULAR', '⚡ Simulateur de streaming Kafka activé (Débit ~1 événement / 2.5s)', {});

    this.simulationInterval = setInterval(() => {
      this.simulateSingleRandomKafkaEvent();
    }, 2500);
  }

  stopContinuousSimulation() {
    this.isSimulationRunning.set(false);
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    this.addTelemetryLog('SYSTEM', 'ANGULAR', 'Simulateur de streaming Kafka mis en pause', {});
  }

  simulateSingleRandomKafkaEvent() {
    const match = this.currentMatch();
    if (!match) return;

    // Choisir une cote au hasard
    const allOdds: Odd[] = [];
    match.markets.forEach((mkt) => allOdds.push(...mkt.odds));
    if (allOdds.length === 0) return;

    const randomOdd = allOdds[Math.floor(Math.random() * allOdds.length)];
    const delta = (Math.random() * 0.3 - 0.14);
    const newValue = Math.max(1.05, Number((randomOdd.currentValue + delta).toFixed(2)));

    this.handleOddUpdated(
      {
        matchId: match.id,
        oddId: randomOdd.id,
        selectionName: randomOdd.selectionName,
        currentValue: newValue,
        previousValue: randomOdd.currentValue,
        status: 'ACTIVE',
        timestamp: Date.now(),
      },
      'KAFKA'
    );
  }

  // ============================================================================
  // 6. Gestion du Ticket de Paris (Betting Slip)
  // ============================================================================
  toggleBetSelection(match: SportMatch, market: any, odd: Odd) {
    this.betSelections.update((current) => {
      const exists = current.find((s) => s.matchId === match.id && s.oddId === odd.id);
      if (exists) {
        return current.filter((s) => !(s.matchId === match.id && s.oddId === odd.id));
      }

      // Remplacer si même marché (ex: ne pas parier 1 ET 2 en même temps sur le même marché)
      const filtered = current.filter((s) => !(s.matchId === match.id && s.marketId === market.id));

      const newSelection: BetSelection = {
        matchId: match.id,
        matchTitle: `${match.homeTeam} vs ${match.awayTeam}`,
        marketId: market.id,
        marketName: market.name,
        oddId: odd.id,
        selectionName: odd.selectionName,
        oddValue: odd.currentValue,
        initialValue: odd.currentValue,
        hasChanged: false,
      };

      return [...filtered, newSelection];
    });
  }

  removeBetSelection(oddId: string) {
    this.betSelections.update((list) => list.filter((s) => s.oddId !== oddId));
  }

  clearBetSlip() {
    this.betSelections.set([]);
  }

  isOddSelected(matchId: string, oddId: string): boolean {
    return this.betSelections().some((s) => s.matchId === matchId && s.oddId === oddId);
  }

  // ============================================================================
  // 7. Requêtes REST vers BFF (ou fallback données de référence)
  // ============================================================================
  async fetchLiveMatchesFromBFF() {
    try {
      const data = await this.http
        .get<SportMatch[]>(`${this.bffUrl()}/api/v1/sports/matches/live`)
        .toPromise();
      if (data && data.length > 0) {
        this.matches.set(data);
        this.addTelemetryLog('SYSTEM', 'BFF_NEST', `Récupération de ${data.length} matchs depuis le BFF Nest`, {
          matchesCount: data.length,
        });
        return;
      }
    } catch {
      // Backend non démarré, les données mockées initiales sont actives
    }
  }

  addTelemetryLog(
    type: TelemetryLog['type'],
    source: TelemetryLog['source'],
    summary: string,
    detail: any,
    matchId?: string
  ) {
    const entry: TelemetryLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type,
      source,
      summary,
      detail,
      timestamp: new Date(),
      matchId,
    };
    this.telemetryLogs.update((logs) => [entry, ...logs.slice(0, 99)]);
  }

  clearTelemetryLogs() {
    this.telemetryLogs.set([]);
  }

  // ============================================================================
  // 8. Données de Référence Réalistes (Postgres seed mirror)
  // ============================================================================
  private initDefaultMockData() {
    const defaultMatches: SportMatch[] = [
      {
        id: 'match-psg-om',
        competitionId: 'ligue-1',
        competitionName: "Ligue 1 McDonald's",
        country: 'France',
        homeTeam: 'Paris Saint-Germain',
        awayTeam: 'Olympique de Marseille',
        startTime: new Date(Date.now() - 68 * 60 * 1000).toISOString(),
        status: 'LIVE',
        scoreHome: 2,
        scoreAway: 1,
        minuteElapsed: 68,
        isLive: true,
        markets: [
          {
            id: 'mkt-psg-om-1n2',
            matchId: 'match-psg-om',
            marketType: '1N2',
            name: 'Résultat du Match (1N2)',
            status: 'OPEN',
            displayOrder: 1,
            odds: [
              {
                id: 'odd-psg-win',
                marketId: 'mkt-psg-om-1n2',
                selectionName: '1 (PSG)',
                currentValue: 1.45,
                previousValue: 1.80,
                status: 'ACTIVE',
                isLiveHot: true,
              },
              {
                id: 'odd-psg-draw',
                marketId: 'mkt-psg-om-1n2',
                selectionName: 'N (Nul)',
                currentValue: 4.20,
                previousValue: 3.80,
                status: 'ACTIVE',
                isLiveHot: true,
              },
              {
                id: 'odd-om-win',
                marketId: 'mkt-psg-om-1n2',
                selectionName: '2 (OM)',
                currentValue: 6.50,
                previousValue: 4.50,
                status: 'ACTIVE',
                isLiveHot: true,
              },
            ],
          },
          {
            id: 'mkt-psg-om-btts',
            matchId: 'match-psg-om',
            marketType: 'BOTH_TEAMS_SCORE',
            name: 'Les deux équipes marquent',
            status: 'OPEN',
            displayOrder: 2,
            odds: [
              {
                id: 'odd-psg-btts-yes',
                marketId: 'mkt-psg-om-btts',
                selectionName: 'Oui',
                currentValue: 1.12,
                previousValue: 1.65,
                status: 'ACTIVE',
                isLiveHot: true,
              },
              {
                id: 'odd-psg-btts-no',
                marketId: 'mkt-psg-om-btts',
                selectionName: 'Non',
                currentValue: 5.50,
                previousValue: 2.10,
                status: 'ACTIVE',
                isLiveHot: true,
              },
            ],
          },
          {
            id: 'mkt-psg-om-ou25',
            matchId: 'match-psg-om',
            marketType: 'OVER_UNDER_2_5',
            name: 'Total de Buts (Plus / Moins 2.5)',
            status: 'OPEN',
            displayOrder: 3,
            odds: [
              {
                id: 'odd-psg-over25',
                marketId: 'mkt-psg-om-ou25',
                selectionName: '+ de 2.5 buts',
                currentValue: 1.05,
                previousValue: 1.35,
                status: 'ACTIVE',
                isLiveHot: true,
              },
              {
                id: 'odd-psg-under25',
                marketId: 'mkt-psg-om-ou25',
                selectionName: '- de 2.5 buts',
                currentValue: 8.50,
                previousValue: 3.10,
                status: 'ACTIVE',
                isLiveHot: true,
              },
            ],
          },
        ],
      },
      {
        id: 'match-real-barca',
        competitionId: 'la-liga',
        competitionName: 'La Liga EA Sports',
        country: 'Espagne',
        homeTeam: 'Real Madrid',
        awayTeam: 'FC Barcelone',
        startTime: new Date(Date.now() + 120 * 60 * 1000).toISOString(),
        status: 'PRE_MATCH',
        scoreHome: 0,
        scoreAway: 0,
        minuteElapsed: 0,
        isLive: false,
        markets: [
          {
            id: 'mkt-real-barca-1n2',
            matchId: 'match-real-barca',
            marketType: '1N2',
            name: 'Résultat du Match (1N2)',
            status: 'OPEN',
            displayOrder: 1,
            odds: [
              {
                id: 'odd-real-win',
                marketId: 'mkt-real-barca-1n2',
                selectionName: '1 (Real Madrid)',
                currentValue: 2.10,
                previousValue: 2.15,
                status: 'ACTIVE',
              },
              {
                id: 'odd-barca-draw',
                marketId: 'mkt-real-barca-1n2',
                selectionName: 'N (Nul)',
                currentValue: 3.60,
                previousValue: 3.50,
                status: 'ACTIVE',
              },
              {
                id: 'odd-barca-win',
                marketId: 'mkt-real-barca-1n2',
                selectionName: '2 (Barcelone)',
                currentValue: 3.10,
                previousValue: 3.00,
                status: 'ACTIVE',
              },
            ],
          },
        ],
      },
      {
        id: 'match-city-liverpool',
        competitionId: 'premier-league',
        competitionName: 'Premier League',
        country: 'Angleterre',
        homeTeam: 'Manchester City',
        awayTeam: 'Liverpool',
        startTime: new Date(Date.now() + 300 * 60 * 1000).toISOString(),
        status: 'PRE_MATCH',
        scoreHome: 0,
        scoreAway: 0,
        minuteElapsed: 0,
        isLive: false,
        markets: [
          {
            id: 'mkt-city-liv-1n2',
            matchId: 'match-city-liverpool',
            marketType: '1N2',
            name: 'Résultat du Match (1N2)',
            status: 'OPEN',
            odds: [
              {
                id: 'odd-city-win',
                marketId: 'mkt-city-liv-1n2',
                selectionName: '1 (Man City)',
                currentValue: 1.95,
                previousValue: 1.95,
                status: 'ACTIVE',
              },
              {
                id: 'odd-city-draw',
                marketId: 'mkt-city-liv-1n2',
                selectionName: 'N (Nul)',
                currentValue: 3.80,
                previousValue: 3.80,
                status: 'ACTIVE',
              },
              {
                id: 'odd-liv-win',
                marketId: 'mkt-city-liv-1n2',
                selectionName: '2 (Liverpool)',
                currentValue: 3.50,
                previousValue: 3.50,
                status: 'ACTIVE',
              },
            ],
          },
        ],
      },
      {
        id: 'match-alcaraz-sinner',
        competitionId: 'atp-masters',
        competitionName: 'ATP Masters 1000',
        country: 'Tennis',
        homeTeam: 'Carlos Alcaraz',
        awayTeam: 'Jannik Sinner',
        startTime: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
        status: 'LIVE',
        scoreHome: 1,
        scoreAway: 0,
        minuteElapsed: 32,
        isLive: true,
        markets: [
          {
            id: 'mkt-alc-sin-vainqueur',
            matchId: 'match-alcaraz-sinner',
            marketType: 'VAINQUEUR',
            name: 'Vainqueur du Match',
            status: 'OPEN',
            odds: [
              {
                id: 'odd-alc-win',
                marketId: 'mkt-alc-sin-vainqueur',
                selectionName: 'Carlos Alcaraz',
                currentValue: 1.62,
                previousValue: 1.85,
                status: 'ACTIVE',
                isLiveHot: true,
              },
              {
                id: 'odd-sin-win',
                marketId: 'mkt-alc-sin-vainqueur',
                selectionName: 'Jannik Sinner',
                currentValue: 2.25,
                previousValue: 1.95,
                status: 'ACTIVE',
                isLiveHot: true,
              },
            ],
          },
        ],
      },
    ];

    this.matches.set(defaultMatches);

    // Événements passés initiaux
    this.matchEvents.set([
      {
        matchId: 'match-psg-om',
        eventType: 'GOAL',
        description: 'BUT DE OUSMANE DEMBÉLÉ (PSG) ! Frappe enroulée lucarne opposée',
        scoreHome: 2,
        scoreAway: 1,
        minute: 54,
        timestamp: Date.now() - 14 * 60 * 1000,
      },
      {
        matchId: 'match-psg-om',
        eventType: 'GOAL',
        description: 'BUT DE MASON GREENWOOD (OM) ! Réduction du score sur contre-attaque',
        scoreHome: 1,
        scoreAway: 1,
        minute: 41,
        timestamp: Date.now() - 27 * 60 * 1000,
      },
      {
        matchId: 'match-psg-om',
        eventType: 'GOAL',
        description: 'BUT DE BRADLEY BARCOLA (PSG) ! Ouverture du score au Parc des Princes',
        scoreHome: 1,
        scoreAway: 0,
        minute: 12,
        timestamp: Date.now() - 56 * 60 * 1000,
      },
    ]);
  }
}
