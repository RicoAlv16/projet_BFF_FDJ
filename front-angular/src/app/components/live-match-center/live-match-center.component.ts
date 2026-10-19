import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SportsLiveService } from '../../services/sports-live.service';
import { Odd, Market } from '../../models/sports.model';

@Component({
  selector: 'app-live-match-center',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (service.currentMatch(); as match) {
      <div class="space-y-4">
        
        <!-- Live Goal Alert Banner (if recently scored) -->
        @if (service.lastGoalBanner(); as goal) {
          <div class="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 border-2 border-amber-400 text-amber-200 shadow-xl shadow-amber-500/10 pulse-goal flex items-center justify-between transition-all animate-bounce">
            <div class="flex items-center gap-3">
              <span class="text-3xl">⚽</span>
              <div>
                <div class="text-xs font-black uppercase tracking-widest text-amber-300 font-mono">Événement Kafka en Direct • {{ goal.minute }}'</div>
                <div class="text-base font-extrabold text-white">{{ goal.description }}</div>
              </div>
            </div>
            <div class="text-right font-mono">
              <div class="text-2xl font-black text-amber-400">{{ goal.scoreHome }} - {{ goal.scoreAway }}</div>
              <div class="text-[10px] text-amber-300/80">Score répercuté en temps réel</div>
            </div>
          </div>
        }

        <!-- Match Scoreboard Hero Card -->
        <div class="glass-panel rounded-2xl p-6 border border-slate-800/80 relative overflow-hidden">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                {{ match.competitionName || 'Ligue 1 McDonald\'s' }}
              </span>
              <span class="text-xs text-slate-500">•</span>
              <span class="text-xs text-slate-400">{{ match.country || 'France' }}</span>
            </div>

            <!-- Live Status & Minute -->
            @if (match.isLive) {
              <div class="flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/60 border border-red-800/80 text-red-300 text-xs font-bold font-mono">
                <span class="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                <span>EN DIRECT</span>
                <span class="text-slate-500">•</span>
                <span class="text-white">{{ match.minuteElapsed }}'</span>
              </div>
            } @else {
              <div class="px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-semibold">
                Avant-Match
              </div>
            }
          </div>

          <!-- Scoreboard Header Teams -->
          <div class="grid grid-cols-1 md:grid-cols-3 items-center gap-6 py-2">
            
            <!-- Home Team -->
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-900 border border-blue-500/30 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-900/30">
                {{ match.homeTeam.substring(0, 3).toUpperCase() }}
              </div>
              <div>
                <h3 class="text-lg font-black text-white leading-tight">{{ match.homeTeam }}</h3>
                <span class="text-xs text-slate-400">Équipe à Domicile</span>
              </div>
            </div>

            <!-- Score Display -->
            <div class="flex flex-col items-center justify-center">
              <div class="flex items-center gap-4 bg-slate-950/80 px-6 py-2.5 rounded-2xl border border-slate-800 shadow-inner">
                <span class="text-4xl font-black font-mono text-white tracking-wider">{{ match.scoreHome }}</span>
                <span class="text-slate-600 font-black text-xl">-</span>
                <span class="text-4xl font-black font-mono text-white tracking-wider">{{ match.scoreAway }}</span>
              </div>
              <div class="text-[10px] font-mono text-cyan-400 mt-2 flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                <span>Stream live synchronisé</span>
              </div>
            </div>

            <!-- Away Team -->
            <div class="flex items-center justify-end gap-4">
              <div class="text-right">
                <h3 class="text-lg font-black text-white leading-tight">{{ match.awayTeam }}</h3>
                <span class="text-xs text-slate-400">Équipe Extérieure</span>
              </div>
              <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-600 to-cyan-800 border border-cyan-500/30 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-cyan-900/30">
                {{ match.awayTeam.substring(0, 3).toUpperCase() }}
              </div>
            </div>

          </div>
        </div>

        <!-- Live Markets & Odds Grid -->
        <div class="space-y-4">
          @for (market of match.markets; track market.id) {
            <div class="glass-panel rounded-2xl p-5 border border-slate-800/80">
              
              <!-- Market Title -->
              <div class="flex items-center justify-between mb-3.5 pb-2 border-b border-slate-800/60">
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <h4 class="text-sm font-bold text-white tracking-wide">{{ market.name }}</h4>
                </div>
                <span class="text-[11px] font-mono text-slate-400">
                  {{ market.odds.length }} sélections disponibles
                </span>
              </div>

              <!-- Odds Buttons Row -->
              <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                @for (odd of market.odds; track odd.id) {
                  <button
                    (click)="service.toggleBetSelection(match, market, odd)"
                    [disabled]="odd.status === 'SUSPENDED'"
                    class="p-3.5 rounded-xl border text-left transition-all duration-300 flex items-center justify-between group cursor-pointer relative overflow-hidden"
                    [ngClass]="{
                      'bg-cyan-500/15 border-cyan-400/80 shadow-md shadow-cyan-500/10': service.isOddSelected(match.id, odd.id),
                      'bg-slate-900/70 hover:bg-slate-850 border-slate-800/80 hover:border-slate-700': !service.isOddSelected(match.id, odd.id),
                      'opacity-50 cursor-not-allowed': odd.status === 'SUSPENDED',
                      'flash-up': odd.flashState === 'up',
                      'flash-down': odd.flashState === 'down'
                    }"
                  >
                    <!-- Selection Name & Market hint -->
                    <div class="flex flex-col pr-2">
                      <span class="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors">
                        {{ odd.selectionName }}
                      </span>
                      @if (odd.previousValue && odd.previousValue !== odd.currentValue) {
                        <span class="text-[10px] text-slate-500 font-mono">
                          préc: {{ odd.previousValue.toFixed(2) }}
                        </span>
                      }
                    </div>

                    <!-- Odd Value & Flash Indicator -->
                    <div class="flex items-center gap-2">
                      @if (odd.flashState === 'up') {
                        <span class="text-[10px] font-bold text-emerald-400 font-mono animate-bounce">▲</span>
                      } @else if (odd.flashState === 'down') {
                        <span class="text-[10px] font-bold text-rose-400 font-mono animate-bounce">▼</span>
                      }

                      <div 
                        class="px-2.5 py-1.5 rounded-lg font-mono font-black text-sm tracking-tight transition-colors shadow-xs"
                        [ngClass]="{
                          'bg-cyan-400 text-black font-extrabold': service.isOddSelected(match.id, odd.id),
                          'bg-slate-950 text-cyan-300 border border-slate-800 group-hover:border-cyan-500/40': !service.isOddSelected(match.id, odd.id)
                        }"
                      >
                        {{ odd.currentValue.toFixed(2) }}
                      </div>
                    </div>

                    <!-- Selected Indicator Checkmark -->
                    @if (service.isOddSelected(match.id, odd.id)) {
                      <div class="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400"></div>
                    }
                  </button>
                }
              </div>

            </div>
          }
        </div>

      </div>
    } @else {
      <div class="p-8 glass-panel rounded-2xl text-center text-slate-400">
        Chargement du match en cours...
      </div>
    }
  `,
})
export class LiveMatchCenterComponent {
  readonly service = inject(SportsLiveService);
}
