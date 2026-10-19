import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SportsLiveService } from '../../services/sports-live.service';

@Component({
  selector: 'app-simulation-console',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="glass-panel rounded-2xl p-5 border border-slate-800/80">
      
      <!-- Console Title -->
      <div class="flex items-center justify-between mb-4 pb-2 border-b border-slate-800/60">
        <div class="flex items-center gap-2.5">
          <div class="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
          <div>
            <h3 class="text-sm font-bold text-white">Console de Test & Injection d'Événements</h3>
            <p class="text-[11px] text-slate-400">Déclenchez manuellement des événements pour observer le flux de bout en bout</p>
          </div>
        </div>

        <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
          Match Actif: {{ service.selectedMatchId() }}
        </span>
      </div>

      <!-- Action Buttons Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        
        <!-- Button: Goal Home -->
        <button
          (click)="triggerGoalHome()"
          class="p-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-200 transition-all flex items-center gap-3 cursor-pointer group active:scale-95"
        >
          <span class="text-xl group-hover:scale-110 transition-transform">⚽</span>
          <div class="text-left">
            <div class="text-xs font-bold text-white">Simuler But Domicile</div>
            <div class="text-[10px] text-blue-300/80 font-mono">triggerGoal(HOME)</div>
          </div>
        </button>

        <!-- Button: Goal Away -->
        <button
          (click)="triggerGoalAway()"
          class="p-3 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-200 transition-all flex items-center gap-3 cursor-pointer group active:scale-95"
        >
          <span class="text-xl group-hover:scale-110 transition-transform">⚽</span>
          <div class="text-left">
            <div class="text-xs font-bold text-white">Simuler But Extérieur</div>
            <div class="text-[10px] text-sky-300/80 font-mono">triggerGoal(AWAY)</div>
          </div>
        </button>

        <!-- Button: Random Odds Fluctuation -->
        <button
          (click)="service.simulateSingleRandomKafkaEvent()"
          class="p-3 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-200 transition-all flex items-center gap-3 cursor-pointer group active:scale-95"
        >
          <span class="text-xl group-hover:scale-110 transition-transform">📈</span>
          <div class="text-left">
            <div class="text-xs font-bold text-white">Fluctuation Aléatoire</div>
            <div class="text-[10px] text-cyan-300/80 font-mono">1 cote mise à jour</div>
          </div>
        </button>

        <!-- Button: Autopilot Mode -->
        <button
          (click)="service.toggleContinuousSimulation()"
          class="p-3 rounded-xl border transition-all flex items-center gap-3 cursor-pointer group active:scale-95"
          [ngClass]="{
            'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/50 text-amber-200 ring-1 ring-amber-400': service.isSimulationRunning(),
            'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800 text-slate-300': !service.isSimulationRunning()
          }"
        >
          <span class="text-xl group-hover:scale-110 transition-transform">
            {{ service.isSimulationRunning() ? '⏸️' : '⚡' }}
          </span>
          <div class="text-left">
            <div class="text-xs font-bold text-white">
              {{ service.isSimulationRunning() ? 'Pause Autopilot' : 'Stream Continu' }}
            </div>
            <div class="text-[10px] text-slate-400 font-mono">
              {{ service.isSimulationRunning() ? 'Émission ~2.5s' : 'Débit automatique' }}
            </div>
          </div>
        </button>

      </div>

      <!-- Explanatory Architecture Footer -->
      <div class="p-3 rounded-xl bg-slate-950/70 border border-slate-900 flex items-start gap-3">
        <span class="text-cyan-400 text-sm mt-0.5">ℹ️</span>
        <p class="text-[11px] text-slate-400 leading-relaxed">
          <strong class="text-slate-200">Circuit événementiel FDJ :</strong> L'action déclenche un envoi immédiat sur le broker Kafka local (fdj-kafka:9092). Le worker NestJS intercepte l'événement via son Consumer Group, applique la mise en cache Redis en mémoire vive et notifie le BFF via Redis Pub/Sub, qui diffuse sans latence aux clients connectés en WebSockets.
        </p>
      </div>

    </div>
  `,
})
export class SimulationConsoleComponent {
  readonly service = inject(SportsLiveService);

  triggerGoalHome() {
    const matchId = this.service.selectedMatchId();
    this.service.triggerGoal(matchId, 'HOME');
  }

  triggerGoalAway() {
    const matchId = this.service.selectedMatchId();
    this.service.triggerGoal(matchId, 'AWAY');
  }
}
