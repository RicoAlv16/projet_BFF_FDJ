import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SportsLiveService } from '../../services/sports-live.service';

@Component({
  selector: 'app-match-events-timeline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="glass-panel rounded-2xl p-5 border border-slate-800/80 h-full flex flex-col">
      
      <!-- Title -->
      <div class="flex items-center justify-between mb-4 pb-2 border-b border-slate-800/60">
        <div class="flex items-center gap-2">
          <span class="text-base">⏱️</span>
          <h3 class="text-sm font-bold text-white">Chronologie du Match en Direct</h3>
        </div>
        <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
          {{ service.matchEvents().length }} événements
        </span>
      </div>

      <!-- Events List -->
      <div class="flex-1 overflow-y-auto space-y-2.5 max-h-[380px] pr-1">
        @for (evt of service.matchEvents(); track evt.timestamp) {
          <div 
            class="p-3 rounded-xl border transition-all flex items-start gap-3 animate-fadeIn"
            [ngClass]="{
              'bg-amber-950/20 border-amber-800/60': evt.eventType === 'GOAL',
              'bg-blue-950/20 border-blue-800/60': evt.eventType === 'VAR',
              'bg-slate-900/60 border-slate-800/80': evt.eventType !== 'GOAL' && evt.eventType !== 'VAR'
            }"
          >
            <!-- Minute Pill -->
            <div class="shrink-0 px-2 py-1 rounded-md bg-slate-950 border border-slate-800 font-mono text-xs font-bold text-cyan-400">
              {{ evt.minute }}'
            </div>

            <!-- Event Details -->
            <div class="flex-1">
              <div class="flex items-center justify-between mb-0.5">
                <span class="text-xs font-bold text-white flex items-center gap-1.5">
                  @if (evt.eventType === 'GOAL') {
                    <span>⚽ BUT !</span>
                  } @else if (evt.eventType === 'VAR') {
                    <span>🖥️ DÉCISION VAR</span>
                  } @else {
                    <span>⚡ ÉVÉNEMENT</span>
                  }
                </span>
                <span class="text-[10px] font-mono font-bold text-amber-400">
                  {{ evt.scoreHome }} - {{ evt.scoreAway }}
                </span>
              </div>
              <p class="text-xs text-slate-300 leading-snug">{{ evt.description }}</p>
            </div>
          </div>
        } @empty {
          <div class="p-6 text-center text-slate-500 text-xs">
            Aucun événement pour le moment sur ce match.
          </div>
        }
      </div>

    </div>
  `,
})
export class MatchEventsTimelineComponent {
  readonly service = inject(SportsLiveService);
}
