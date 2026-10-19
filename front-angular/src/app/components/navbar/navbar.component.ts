import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SportsLiveService } from '../../services/sports-live.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="border-b border-slate-800/80 bg-[#070b14]/90 backdrop-blur-xl sticky top-0 z-50">
      <!-- Top Accent Bar: FDJ Blue & Neon Cyan -->
      <div class="h-1 w-full bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-400"></div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-18">
          
          <!-- Logo & Brand Identity -->
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-cyan-500/20 tracking-tighter">
              FDJ
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-lg font-black tracking-tight text-white">
                  PARIONS<span class="text-cyan-400">SPORT</span>
                </span>
                <span class="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-cyan-950 text-cyan-300 border border-cyan-800/60 tracking-wider">
                  Live Streaming
                </span>
              </div>
              <p class="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                <span>Architecture Événementielle Kafka</span>
                <span class="text-slate-600">•</span>
                <span class="text-emerald-400 font-semibold">BFF & Microservices</span>
              </p>
            </div>
          </div>

          <!-- Middle: Match Selector Pills -->
          <div class="hidden lg:flex items-center gap-1.5 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800/80">
            @for (match of service.matches(); track match.id) {
              <button
                (click)="service.selectMatch(match.id)"
                class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer"
                [ngClass]="{
                  'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10': service.selectedMatchId() === match.id,
                  'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent': service.selectedMatchId() !== match.id
                }"
              >
                @if (match.isLive) {
                  <span class="relative flex h-2 w-2">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                } @else {
                  <span class="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                }
                <span>{{ match.homeTeam }} - {{ match.awayTeam }}</span>
                @if (match.isLive) {
                  <span class="font-mono font-bold text-slate-300">({{ match.scoreHome }}-{{ match.scoreAway }})</span>
                }
              </button>
            }
          </div>

          <!-- Right Status & Controls -->
          <div class="flex items-center gap-3">
            
            <!-- WebSocket Status Pill -->
            <div 
              class="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-md transition-all cursor-pointer"
              [ngClass]="{
                'bg-emerald-950/40 text-emerald-300 border-emerald-800/80': service.wsConnected(),
                'bg-amber-950/40 text-amber-300 border-amber-800/80 animate-pulse': service.wsConnecting(),
                'bg-slate-900 text-slate-400 border-slate-800': !service.wsConnected() && !service.wsConnecting()
              }"
              (click)="service.connectWebSocket()"
              [title]="service.wsConnected() ? 'Connecté au Socket.IO /live (BFF NestJS)' : 'Cliquer pour reconnecter le Socket.IO'"
            >
              <span class="relative flex h-2 w-2">
                @if (service.wsConnected()) {
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                } @else {
                  <span class="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                }
              </span>
              <span class="font-mono">
                {{ service.wsConnected() ? 'WS /live (' + service.wsLatency() + 'ms)' : 'WS Déconnecté' }}
              </span>
            </div>

            <!-- Event Counter Pill -->
            <div class="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-slate-300">
              <span class="text-cyan-400">⚡</span>
              <span>{{ service.eventCount() }}</span>
              <span class="text-[10px] text-slate-500 font-sans font-normal uppercase">evts</span>
            </div>

            <!-- Autopilot Simulator Button -->
            <button
              (click)="service.toggleContinuousSimulation()"
              class="flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-md"
              [ngClass]="{
                'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-amber-500/20 ring-2 ring-amber-400/50 animate-pulse': service.isSimulationRunning(),
                'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700': !service.isSimulationRunning()
              }"
              [title]="service.isSimulationRunning() ? 'Arrêter la simulation automatique' : 'Activer le flux continu de simulation Kafka'"
            >
              <span class="text-sm">{{ service.isSimulationRunning() ? '⏹' : '▶' }}</span>
              <span class="hidden md:inline">
                {{ service.isSimulationRunning() ? 'Flux Démo Actif' : 'Simuler Kafka' }}
              </span>
            </button>

          </div>

        </div>
      </div>
    </header>
  `,
})
export class NavbarComponent {
  readonly service = inject(SportsLiveService);
}
