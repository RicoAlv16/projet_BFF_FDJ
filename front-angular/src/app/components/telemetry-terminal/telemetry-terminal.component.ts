import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SportsLiveService } from '../../services/sports-live.service';
import { TelemetryLog } from '../../models/sports.model';

@Component({
  selector: 'app-telemetry-terminal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="glass-panel rounded-2xl border border-slate-800/80 overflow-hidden flex flex-col h-[320px]">
      
      <!-- Terminal Header -->
      <div class="bg-slate-950 px-4 py-2.5 border-b border-slate-800/80 flex items-center justify-between">
        
        <!-- Window Controls & Title -->
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
            <span class="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
            <span class="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
          </div>
          <span class="text-xs font-mono font-bold text-slate-300 flex items-center gap-2">
            <span>Terminal d'Événements & Télémétrie</span>
            <span class="text-[10px] text-cyan-400 font-normal">fdj-kafka-stream</span>
          </span>
        </div>

        <!-- Filter Buttons & Actions -->
        <div class="flex items-center gap-2">
          
          <!-- Filter source -->
          <select 
            [value]="filterSource()" 
            (change)="onFilterChange($event)"
            class="bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300 rounded-lg px-2 py-1 cursor-pointer focus:ring-1 focus:ring-cyan-500"
          >
            <option value="ALL">Tous les composants</option>
            <option value="JAVA_CORE">Java Core Engine</option>
            <option value="KAFKA">Apache Kafka</option>
            <option value="WORKER_NEST">Worker NestJS</option>
            <option value="BFF_NEST">BFF NestJS</option>
            <option value="ANGULAR">Client Angular</option>
          </select>

          <!-- Clear Button -->
          <button
            (click)="service.clearTelemetryLogs()"
            class="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-[10px] font-mono text-slate-400 hover:text-white border border-slate-800 cursor-pointer"
            title="Vider les logs"
          >
            Vider
          </button>
        </div>

      </div>

      <!-- Logs Stream View -->
      <div class="flex-1 p-3 overflow-y-auto font-mono text-xs space-y-1.5 bg-[#050811] text-slate-300">
        @for (log of filteredLogs(); track log.id) {
          <div class="p-2 rounded-lg bg-slate-950/60 hover:bg-slate-900/60 border border-slate-900/80 transition-all">
            <div class="flex items-center justify-between gap-2 mb-1">
              
              <div class="flex items-center gap-2 flex-wrap">
                <!-- Timestamp -->
                <span class="text-[10px] text-slate-500">
                  {{ log.timestamp | date:'HH:mm:ss.SSS' }}
                </span>

                <!-- Source Badge -->
                <span 
                  class="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase"
                  [ngClass]="{
                    'bg-blue-950 text-blue-400 border border-blue-800/60': log.source === 'JAVA_CORE',
                    'bg-cyan-950 text-cyan-400 border border-cyan-800/60': log.source === 'KAFKA',
                    'bg-rose-950 text-rose-400 border border-rose-800/60': log.source === 'WORKER_NEST',
                    'bg-emerald-950 text-emerald-400 border border-emerald-800/60': log.source === 'BFF_NEST',
                    'bg-slate-900 text-slate-300 border border-slate-700': log.source === 'ANGULAR'
                  }"
                >
                  {{ log.source }}
                </span>

                <!-- Type Badge -->
                <span class="text-[10px] text-slate-400 font-semibold">
                  [{{ log.type }}]
                </span>
              </div>

              <!-- Match Tag if any -->
              @if (log.matchId) {
                <span class="text-[9px] text-slate-500 font-mono">
                  match:{{ log.matchId }}
                </span>
              }
            </div>

            <!-- Log Summary -->
            <div class="text-[11px] text-slate-200">
              {{ log.summary }}
            </div>

            <!-- Collapsible Payload Inspector -->
            @if (log.detail && (log.detail | json) !== '{}') {
              <details class="mt-1">
                <summary class="text-[10px] text-cyan-400 cursor-pointer hover:underline">
                  Payload JSON inspecté
                </summary>
                <pre class="mt-1 p-2 rounded bg-black/60 text-[10px] text-emerald-300 overflow-x-auto border border-slate-900">{{ log.detail | json }}</pre>
              </details>
            }
          </div>
        } @empty {
          <div class="p-8 text-center text-slate-600 font-mono text-xs">
            En attente de nouveaux événements sur le bus Kafka...
          </div>
        }
      </div>

    </div>
  `,
})
export class TelemetryTerminalComponent {
  readonly service = inject(SportsLiveService);
  readonly filterSource = signal<string>('ALL');

  onFilterChange(event: any) {
    this.filterSource.set(event.target.value);
  }

  filteredLogs() {
    const list = this.service.telemetryLogs();
    const filter = this.filterSource();
    if (filter === 'ALL') return list;
    return list.filter((l) => l.source === filter);
  }
}
