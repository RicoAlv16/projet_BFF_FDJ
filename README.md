# 🏆 FDJ Parions Sport — Architecture Événementielle Distribuée & BFF

> **Backbone Streaming temps réel pour la cotation sportive en direct**  
> Conception et implémentation d'une chaîne complète événementielle : du calcul algorithmique en Java jusqu'au rafraîchissement réactif dans le navigateur via Kafka, Redis et WebSockets.

---

## 📑 Sommaire

1. [Vue d'Ensemble & Enjeux Métier](#-1-vue-densemble--enjeux-métier)
2. [Schéma d'Architecture de Bout en Bout](#-2-schéma-darchitecture-de-bout-en-bout)
3. [Détail des Composants du Système](#-3-détail-des-composants-du-système)
   - [A. Infrastructure Docker (KRaft, Redis, Postgres, Mongo)](#a-infrastructure-docker-infra)
   - [B. Core Engine Java (Spring Boot Producer)](#b-core-engine-java-backend-java)
   - [C. Worker NestJS (Kafka Consumer)](#c-worker-nestjs-worker-nest)
   - [D. BFF NestJS (Passerelle WebSockets & Agrégateur)](#d-bff-nestjs-bff-nest)
   - [E. Front-End Angular 21 (Observateur Live)](#e-front-end-angular-21-front-angular)
4. [Arguments d'Architecture & Questions d'Entretien](#-4-arguments-darchitecture--questions-dentretien)
5. [Guide de Démarrage Rapide (Pas à Pas)](#-5-guide-de-démarrage-rapide-pas-à-pas)
6. [Tableau Récapitulatif des Ports & Accès](#-6-tableau-récapitulatif-des-ports--accès)
7. [Scénario de Démonstration en 2 Minutes](#-7-scénario-de-démonstration-en-2-minutes)

---

## 🎯 1. Vue d'Ensemble & Enjeux Métier

Dans le secteur des paris sportifs en direct (notamment chez la **FDJ - BU Sport**), les soirs de grands matchs (ex: *Classique PSG - OM* ou finale de Ligue des Champions) imposent des contraintes techniques extrêmes :

* **Volume & Débit massif** : Des dizaines de milliers de mises à jour de cotes par seconde générées par des modèles probabilistes.
* **Latence critique (< 50 ms)** : Un parieur doit voir la cote évoluer instantanément sur son application mobile ou son écran en point de vente (PSPDV).
* **Ordre chronologique strict** : Une cote à 1.45 calculée à 14h00m01s ne doit **jamais** être traitée après une cote à 1.20 calculée à 14h00m02s (risque financier majeur).
* **Découplage & Résilience** : Même si le BFF ou les applications clientes subissent un pic de charge, le moteur de calcul Java ne doit jamais être ralenti.
* **Régulation ANJ (Autorité Nationale des Jeux)** : Traçabilité, certification des flux et suspension immédiate des cotes en cas de but ou de consultation de la VAR.

Pour répondre à ces exigences, le projet implémente le patron **Event-Driven Architecture (EDA)** couplé au patron **Backend For Frontend (BFF)**.

---

## 📐 2. Schéma d'Architecture de Bout en Bout

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               PIPELINE ÉVÉNEMENTIEL FDJ                                │
└────────────────────────────────────────────────────────────────────────────────────────┘

 1. CORE JAVA (Spring Boot)        2. APACHE KAFKA 7.6 (KRaft)       3. WORKER (NestJS)
┌───────────────────────────┐     ┌───────────────────────────┐     ┌───────────────────────────┐
│ • Calcul des probabilités │     │ Cluster sans ZooKeeper    │     │ Microservice d'ingestion  │
│ • Simulateur algorithmique│ ──> │ Topic: sports.odds.updated│ ──> │ Consumer Group:           │
│ • KafkaTemplate.send()    │     │ Clé: matchId              │     │  fdj-odds-worker-group    │
│ • acks=all & Idempotence  │     │ Ordre par partition garanti│     │ Validation stricte DTO    │
└───────────────────────────┘     └───────────────────────────┘     └─────────────┬─────────────┘
                                                                                  │
                                                                                  ▼
 6. CLIENT ANGULAR 21              5. BFF NESTJS (Gateway)           4. REDIS 7 (In-Memory)
┌───────────────────────────┐     ┌───────────────────────────┐     ┌───────────────────────────┐
│ • Dashboard Observateur   │     │ • Gateway Socket.IO /live │     │ • Cache chaud RAM:        │
│ • Signals réactifs        │ <── │ • Rooms par match         │ <── │    odds:match-psg-om      │
│ • Flash vert/rouge cotes  │     │ • Agrégateur REST cotes   │     │ • Bus Pub/Sub temps réel: │
│ • Ticket PSPDV & QR Code  │     │ • Swagger OpenAPI         │     │    odds:channel           │
└───────────────────────────┘     └───────────────────────────┘     └───────────────────────────┘
```

---

## 🧱 3. Détail des Composants du Système

### A. Infrastructure Docker (`infra/` & `docker-compose.yml`)
Tout l'environnement tiers est provisionné via Docker Compose :
* **Apache Kafka 7.6.0 en mode KRaft** (`ports: 9092, 9093`) : Fini ZooKeeper ! Kafka s'auto-administre via son quorum Raft interne.
* **Kafka UI Provectus** (`port: 8080`) : Interface Web pour visualiser en direct les clusters, topics, messages bruts, offsets et partitions.
* **Redis 7 Alpine** (`port: 6379`) : Cache en mémoire vive ultra-rapide avec persistance AOF pour conserver le dernier état des cotes et distribuer les flux via Pub/Sub.
* **PostgreSQL 16** (`port: 5433:5432`) : Base relationnelle transactionnelle pour le catalogue des matchs, compétitions, marchés et tickets de paris avec audit ANJ.
* **MongoDB 7.0** (`port: 27017`) : Base documentaire pour le CMS marketing (bannières publicitaires et promotions).

### B. Core Engine Java (`backend-java/`)
* **Stack** : Java 21, Spring Boot 3.5, Spring Data JPA, Hibernate, Spring Kafka.
* **Rôle** : Cerveau mathématique et métier. Il détient le catalogue des matchs et fait évoluer les cotes en direct.
* **Paramétrage Kafka Producer d'Expert** ([KafkaProducerConfig.java](file:///Users/ricoanicson/MesProjetsDev/projet_BFF_FDJ/backend-java/src/main/java/com/fdj/backend_java/kafka/KafkaProducerConfig.java)) :
  * `ProducerConfig.ACKS_CONFIG = "all"` : Zéro perte de message.
  * `ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG = true` : Évite les doublons en cas de retry réseau.
  * `JsonSerializer.ADD_TYPE_INFO_HEADERS = false` : **Crucial en architecture polyglotte !** Empêche Spring d'injecter des classes Java (`__TypeId__`) dans les headers Kafka, permettant ainsi au consommateur TypeScript/NestJS de désérialiser du pur JSON sans accroc.
* **Clé de partitionnement** ([OddsKafkaProducer.java](file:///Users/ricoanicson/MesProjetsDev/projet_BFF_FDJ/backend-java/src/main/java/com/fdj/backend_java/kafka/OddsKafkaProducer.java)) :
  * `kafkaTemplate.send(topic, event.getMatchId(), event)` : L'utilisation systématique de `matchId` garantit que toutes les cotes d'un même match sont envoyées sur la **même partition**, préservant l'ordre chronologique d'arrivée.
* **Endpoint de Simulation de But** :
  * `POST http://localhost:8081/api/v1/matches/{id}/trigger-goal?team=HOME|AWAY` : Simule un but, réajuste les cotes et émet l'événement sur le topic `sports.match.events`.

### C. Worker NestJS (`worker-nest/`)
* **Stack** : NestJS 11, `@nestjs/microservices`, `kafkajs`, `ioredis`, `class-validator`.
* **Rôle** : Consommateur pur, hautement scalable, sans surface HTTP.
* **Consumer Group** : `fdj-odds-worker-group`.
* **Traitement** ([odds.consumer.ts](file:///Users/ricoanicson/MesProjetsDev/projet_BFF_FDJ/worker-nest/src/consumers/odds.consumer.ts)) :
  1. Intercepte l'événement `@EventPattern('sports.odds.updated')`.
  2. Valide le DTO (`OddsUpdatedDto`).
  3. Enregistre la cote dans le cache chaud Redis (`HSET odds:match-psg-om odd-1 1.45`).
  4. Publie la notification sur le canal Redis Pub/Sub (`PUBLISH odds:channel {...}`).

### D. BFF NestJS (`bff-nest/`)
* **Stack** : NestJS 11, `@nestjs/websockets`, `socket.io`, `@nestjs/swagger`, `axios`.
* **Port** : `3001` (préfixe `/api/v1`).
* **Passerelle WebSockets Socket.IO** ([live.gateway.ts](file:///Users/ricoanicson/MesProjetsDev/projet_BFF_FDJ/bff-nest/src/modules/live-gateway/live.gateway.ts)) :
  * Namespace : `/live`.
  * Écoute le canal Redis Pub/Sub en tâche de fond.
  * Découpe la diffusion en **Rooms ciblées** (`client.join("match:match-psg-om")`) : un parieur qui regarde PSG-OM ne reçoit **que** les flux de son match, évitant la saturation de la bande passante mobile.
* **Agrégateur REST** ([sports-catalog.service.ts](file:///Users/ricoanicson/MesProjetsDev/projet_BFF_FDJ/bff-nest/src/modules/sports-catalog/sports-catalog.service.ts)) :
  * Fusionne les données structurelles du Core Java avec les cotes en direct en mémoire vive depuis Redis.
  * Documentation OpenAPI interactive sur [http://localhost:3001/api/docs](http://localhost:3001/api/docs).

### E. Front-End Angular 21 (`front-angular/`)
* **Stack** : Angular 21 (Standalone Components, Signals réactifs), Tailwind CSS v4, `socket.io-client`.
* **Port** : `4200`.
* **Composants Développés** :
  * **[NavbarComponent](file:///Users/ricoanicson/MesProjetsDev/projet_BFF_FDJ/front-angular/src/app/components/navbar/navbar.component.ts)** : Sélecteur de match live, indicateur d'état et de latence WebSocket (`WS /live - 8ms`), compteur d'événements Kafka en direct.
  * **[PipelineVisualizerComponent](file:///Users/ricoanicson/MesProjetsDev/projet_BFF_FDJ/front-angular/src/app/components/pipeline-visualizer/pipeline-visualizer.component.ts)** : Visualisation interactive en 5 blocs de l'architecture événementielle.
  * **[SimulationConsoleComponent](file:///Users/ricoanicson/MesProjetsDev/projet_BFF_FDJ/front-angular/src/app/components/simulation-console/simulation-console.component.ts)** : Console de test pour déclencher des buts et activer l'autopilot de streaming Kafka.
  * **[LiveMatchCenterComponent](file:///Users/ricoanicson/MesProjetsDev/projet_BFF_FDJ/front-angular/src/app/components/live-match-center/live-match-center.component.ts)** : Tableau d'affichage avec score en temps réel, bandeau d'alerte de but animé, et cotes clignotant en **vert** lors d'une hausse (`▲`) et en **rouge** lors d'une baisse (`▼`).
  * **[BetSlipComponent](file:///Users/ricoanicson/MesProjetsDev/projet_BFF_FDJ/front-angular/src/app/components/bet-slip/bet-slip.component.ts)** : Coupon de paris interactif avec calcul de gains potentiels, alerte de fluctuation et modal de génération de QR Code Point de Vente certifié ANJ.
  * **[TelemetryTerminalComponent](file:///Users/ricoanicson/MesProjetsDev/projet_BFF_FDJ/front-angular/src/app/components/telemetry-terminal/telemetry-terminal.component.ts)** : Terminal d'inspection des flux bruts avec inspecteur JSON dépliable.

---

## 💡 4. Arguments d'Architecture & Questions d'Entretien

Voici les réponses types à dégainer face à un recruteur ou un tech lead :

| Question d'Entretien | Réponse Technique de Haut Niveau |
| :--- | :--- |
| **« Pourquoi Kafka et pas RabbitMQ ? »** | *RabbitMQ est un courtier de messages qui supprime le message dès consommation. Kafka est un **journal distribué ordonné et persistant**. Il supporte des débits 10x supérieurs (millions de msg/sec), permet le rejeu d'événements (*event replay*) en cas de panne, et isole le moteur de calcul du reste du système.* |
| **« Qu'est-ce que le mode KRaft ? »** | *Kafka Raft Metadata Mode. Depuis Kafka 3.3+, ZooKeeper est supprimé. Le consensus et l'élection du contrôleur se font directement entre brokers Kafka via l'algorithme Raft, divisant par deux la complexité d'infrastructure et accélérant les bascules de panne.* |
| **« Comment garantissez-vous l'ordre des cotes ? »** | *Dans Kafka, l'ordre n'est garanti qu'**au sein d'une même partition**. En définissant le `matchId` comme clé de message (`key`), l'algorithme de hachage de Kafka route obligatoirement toutes les cotes d'un match vers la même partition, garantissant un traitement séquentiel strict.* |
| **« Pourquoi passer par Redis entre le Worker et le BFF ? »** | *Redis remplit deux fonctions vitales : 1. **Cache chaud en RAM** pour servir les requêtes REST instantanément sans solliciter la base PostgreSQL. 2. **Bus Pub/Sub** pour réveiller immédiatement les passerelles WebSockets sans forcer le BFF à être lui-même un client Kafka.* |
| **« Comment scalez-vous en cas de forte charge ? »** | *On ne duplique pas le cluster Kafka. Sur Kubernetes, on augmente le nombre de répliques des **Workers NestJS** (via HPA) jusqu'au nombre de partitions du topic. Côté Kafka, on pratique le scale-out en ajoutant des brokers au cluster existant via Strimzi ou AWS MSK.* |
| **« Qu'est-ce que le Consumer Lag ? »** | *C'est le nombre de messages accumulés dans une partition que le consommateur n'a pas encore traités. C'est le KPI n°1 de surveillance. S'il augmente anormalement, cela déclenche une alerte de saturation du worker.* |

---

## 🚀 5. Guide de Démarrage Rapide (Pas à Pas)

### Prérequis
* Docker & Docker Compose
* Node.js v20+ (avec npm)
* Java 21 (JDK)

---

### Étape 1 : Démarrer l'Infrastructure Docker
```bash
docker compose up -d
```
*Vérifiez la santé des conteneurs :*
```bash
docker ps
```
Tous les conteneurs (`fdj-kafka`, `fdj-kafka-ui`, `fdj-redis`, `fdj-postgres`, `fdj-mongo`) doivent afficher l'état `healthy` ou `Up`.

---

### Étape 2 : Démarrer le Core Java (Terminal 1)
```bash
cd backend-java
./mvnw spring-boot:run
```
Le moteur démarre sur le port **`8081`**, se connecte à PostgreSQL (`5433`) et commence à émettre les flux de simulation sur Kafka (`localhost:9092`).

---

### Étape 3 : Démarrer le Worker Kafka (Terminal 2)
```bash
cd worker-nest
npm run start:dev
```
Le worker rejoint le Consumer Group `fdj-odds-worker-group` et affiche :  
`🚀 [FDJ WORKER] Microservice Kafka démarré et à l'écoute des streams !`

---

### Étape 4 : Démarrer le BFF NestJS (Terminal 3)
```bash
cd bff-nest
npm run start:dev
```
Le BFF démarre sur le port **`3001`**, s'abonne aux canaux Redis Pub/Sub et initialise la passerelle Socket.IO `/live`.

---

### Étape 5 : Démarrer le Front-End Angular (Terminal 4)
```bash
cd front-angular
npm start
```
L'interface est accessible sur **[http://localhost:4200/](http://localhost:4200/)**.

---

## 📊 6. Tableau Récapitulatif des Ports & Accès

| Service | Technologie | Port | URL / Point d'accès | Rôle Principal |
| :--- | :--- | :--- | :--- | :--- |
| **Front-End** | Angular 21 + Tailwind | `4200` | [http://localhost:4200/](http://localhost:4200/) | Dashboard Observateur Live & Paris |
| **BFF API** | NestJS | `3001` | [http://localhost:3001/api/v1](http://localhost:3001/api/v1) | Agrégateur REST & Gateway WebSocket |
| **Swagger** | OpenAPI Docs | `3001` | [http://localhost:3001/api/docs](http://localhost:3001/api/docs) | Documentation interactive des APIs BFF |
| **Core Java** | Spring Boot 3 / Java 21 | `8081` | [http://localhost:8081/api/v1/matches/live](http://localhost:8081/api/v1/matches/live) | Moteur de calcul & Producteur Kafka |
| **Kafka UI** | Provectus | `8080` | [http://localhost:8080](http://localhost:8080) | Supervision des Topics & Messages Kafka |
| **Kafka Broker**| Confluent CP 7.6 KRaft| `9092` | `localhost:9092` | Broker streaming événementiel |
| **Redis** | Redis 7 Alpine | `6379` | `localhost:6379` | Cache chaud en RAM & Bus Pub/Sub |
| **PostgreSQL** | Postgres 16 | `5433` | `localhost:5433` (db: `fdj_sportsbook`) | Base transactionnelle & Schéma ANJ |
| **MongoDB** | Mongo 7.0 | `27017` | `localhost:27017` (db: `fdj_cms`) | Contenus CMS & Bannières marketing |

---

## 🎬 7. Scénario de Démonstration en 2 Minutes

Pour présenter le projet devant un recruteur ou une équipe technique :

1. **Montrer la chaîne active sur [http://localhost:4200/](http://localhost:4200/)** :
   * Attirez l'attention sur la pilule verte **`WS /live (8ms)`** qui certifie la liaison WebSocket bidirectionnelle avec le BFF.
   * Montrez le composant **Pipeline Événementiel** en haut expliquant les 5 étapes de bout en bout.
2. **Déclencher un événement métier en direct** :
   * Cliquez sur **« Simuler But Domicile (PSG) »** dans la Console de Test.
   * **Observez la réaction en chaîne en direct :**
     1. Le terminal Java logue l'envoi de l'événement de but sur le topic `sports.match.events`.
     2. Le worker NestJS intercepte le message, logue l'ingestion et met à jour Redis.
     3. Le BFF reçoit la notification Redis Pub/Sub et diffuse à la room `match:match-psg-om`.
     4. Sur l'interface Angular, la bannière dorée **« ⚽ BUT ! »** surgit, le score passe à 3-1, et les cotes 1N2 flashent en **vert** et en **rouge** !
3. **Tester le Coupon de Paris & Régulation ANJ** :
   * Cliquez sur la cote du PSG pour l'ajouter au coupon.
   * Cliquez sur **« Générer QR Code Point de Vente »** pour afficher le ticket dématérialisé avec signature HMAC prêt pour les buralistes.
4. **Vérifier les entrailles sur Kafka UI ([http://localhost:8080](http://localhost:8080))** :
   * Ouvrez l'interface Kafka UI pour montrer le topic `sports.odds.updated` avec ses messages JSON réels et ses offsets incrémentés.

---

*Projet conçu avec passion pour l'excellence technique et les architectures événementielles distribuées de la BU Sport FDJ.*
