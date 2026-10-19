import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SportsLiveService } from '../../services/sports-live.service';

@Component({
  selector: 'app-pipeline-visualizer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800/80 relative overflow-hidden">
      <!-- Glow ambient background -->
      <div class="absolute -top-16 -left-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-16 -right-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <!-- Header with info -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5 border-b border-slate-800/60 pb-3">
        <div class="flex items-center gap-2.5">
          <div class="p-2 rounded-xl bg-cyan-950/60 border border-cyan-800/50 text-cyan-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h2 class="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              <span>Pipeline Événementiel en Temps Réel</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-mono">
                KRaft • Event-Driven
              </span>
            </h2>
            <p class="text-xs text-slate-400">
              Traçabilité de bout en bout : du calcul algorithmique en Java jusqu'au rafraîchissement Angular
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 text-[11px] font-mono text-slate-400 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
          <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span>Clé de partitionnement :</span>
          <span class="text-cyan-300 font-bold">matchId='{{ service.selectedMatchId() }}'</span>
        </div>
      </div>

      <!-- Pipeline Steps Diagram -->
      <div class="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
        
        <!-- 1. Java Core Engine -->
        <div class="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-blue-500/40 transition-all flex flex-col justify-between group">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-[10px] font-bold uppercase tracking-wider text-blue-400 font-mono">1. Producteur</span>
              <span class="px-1.5 py-0.5 rounded text-[9px] bg-blue-950/80 text-blue-300 border border-blue-800/50">Spring Boot</span>
            </div>
            <h3 class="text-xs font-bold text-white mb-1">Core Engine Java</h3>
            <p class="text-[11px] text-slate-400 leading-relaxed mb-2">
              Calcul de probabilités & génération des cotes.
            </p>
          </div>
          <div class="pt-2 border-t border-slate-900 font-mono text-[10px] text-slate-400 space-y-0.5">
            <div class="text-blue-300/80 font-semibold truncate">KafkaTemplate.send()</div>
            <div class="text-slate-500 text-[9px]">acks=all • idempotence=true</div>
          </div>
        </div>

        <!-- 2. Apache Kafka (KRaft) -->
        <div class="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/40 transition-all flex flex-col justify-between group">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-[10px] font-bold uppercase tracking-wider text-cyan-400 font-mono">2. Backbone Stream</span>
              <span class="px-1.5 py-0.5 rounded text-[9px] bg-cyan-950/80 text-cyan-300 border border-cyan-800/50">KRaft Mode</span>
            </div>
            <h3 class="text-xs font-bold text-white mb-1">Apache Kafka 7.6</h3>
            <p class="text-[11px] text-slate-400 leading-relaxed mb-2">
              Broker distribué, persistance & ordre strict garanti par clé.
            </p>
          </div>
          <div class="pt-2 border-t border-slate-900 font-mono text-[10px] text-slate-400 space-y-0.5">
            <div class="text-cyan-300/80 truncate">Topic: sports.odds.updated</div>
            <div class="text-slate-500 text-[9px]">Partitions par matchId</div>
          </div>
        </div>

        <!-- 3. Worker NestJS -->
        <div class="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-rose-500/40 transition-all flex flex-col justify-between group">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-[10px] font-bold uppercase tracking-wider text-rose-400 font-mono">3. Consommateur</span>
              <span class="px-1.5 py-0.5 rounded text-[9px] bg-rose-950/80 text-rose-300 border border-rose-800/50">NestJS Worker</span>
            </div>
            <h3 class="text-xs font-bold text-white mb-1">Worker Microservice</h3>
            <p class="text-[11px] text-slate-400 leading-relaxed mb-2">
              Consomme le stream, valide le DTO et alimente Redis.
            </p>
          </div>
          <div class="pt-2 border-t border-slate-900 font-mono text-[10px] text-slate-400 space-y-0.5">
            <div class="text-rose-300/80 truncate">Group: fdj-odds-worker</div>
            <div class="text-slate-500 text-[9px]">At-Least-Once Delivery</div>
          </div>
        </div>

        <!-- 4. Redis Cache & Pub/Sub -->
        <div class="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-red-500/40 transition-all flex flex-col justify-between group">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-[10px] font-bold uppercase tracking-wider text-amber-400 font-mono">4. Cache & Bus</span>
              <span class="px-1.5 py-0.5 rounded text-[9px] bg-amber-950/80 text-amber-300 border border-amber-800/50">Redis 7</span>
            </div>
            <h3 class="text-xs font-bold text-white mb-1">Redis Hot Storage</h3>
            <p class="text-[11px] text-slate-400 leading-relaxed mb-2">
              Dernière cote en RAM & diffusion instantanée Pub/Sub.
            </p>
          </div>
          <div class="pt-2 border-t border-slate-900 font-mono text-[10px] text-slate-400 space-y-0.5">
            <div class="text-amber-300/80 truncate">Channel: odds:channel</div>
            <div class="text-slate-500 text-[9px]">HSET odds:match-xxx</div>
          </div>
        </div>

        <!-- 5. BFF NestJS & WebSockets -->
        <div class="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-emerald-500/40 transition-all flex flex-col justify-between group">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-400 font-mono">5. Diffusion Client</span>
              <span class="px-1.5 py-0.5 rounded text-[9px] bg-emerald-950/80 text-emerald-300 border border-emerald-800/50">BFF Nest</span>
            </div>
            <h3 class="text-xs font-bold text-white mb-1">Socket.IO Gateway</h3>
            <p class="text-[11px] text-slate-400 leading-relaxed mb-2">
              Push temps réel ciblé par match dans les navigateurs.
            </p>
          </div>
          <div class="pt-2 border-t border-slate-900 font-mono text-[10px] text-slate-400 space-y-0.5">
            <div class="text-emerald-300/80 truncate">Namespace: /live</div>
            <div class="text-slate-500 text-[9px]">Room: match:{{ service.selectedMatchId() }}</div>
          </div>
        </div>

      </div>
    </div>
  `,
})
export class PipelineVisualizerComponent {
  readonly service = inject(SportsLiveService);
}
