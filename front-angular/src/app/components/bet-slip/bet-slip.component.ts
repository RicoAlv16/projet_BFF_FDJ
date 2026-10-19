import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SportsLiveService } from '../../services/sports-live.service';

@Component({
  selector: 'app-bet-slip',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="glass-panel rounded-2xl p-5 border border-slate-800/80 flex flex-col justify-between h-full">
      
      <!-- Slip Header -->
      <div>
        <div class="flex items-center justify-between mb-4 pb-2 border-b border-slate-800/60">
          <div class="flex items-center gap-2">
            <span class="text-base">🎟️</span>
            <div>
              <h3 class="text-sm font-bold text-white">Ticket de Paris Parions Sport</h3>
              <p class="text-[10px] text-slate-400 font-mono">Mode PSEL / PSPDV (Point de Vente)</p>
            </div>
          </div>
          
          @if (service.betSelections().length > 0) {
            <button
              (click)="service.clearBetSlip()"
              class="text-[10px] text-rose-400 hover:text-rose-300 font-semibold cursor-pointer underline"
            >
              Effacer
            </button>
          }
        </div>

        <!-- Selections List -->
        <div class="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
          @for (item of service.betSelections(); track item.oddId) {
            <div 
              class="p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all relative group"
              [ngClass]="{ 'border-cyan-500/50 shadow-sm shadow-cyan-500/10': item.hasChanged }"
            >
              <div class="flex items-start justify-between">
                <div>
                  <span class="text-[10px] font-mono text-cyan-400 uppercase font-bold">{{ item.marketName }}</span>
                  <div class="text-xs font-bold text-white">{{ item.selectionName }}</div>
                  <div class="text-[11px] text-slate-400 truncate max-w-[170px]">{{ item.matchTitle }}</div>
                </div>

                <div class="text-right flex flex-col items-end">
                  <button 
                    (click)="service.removeBetSelection(item.oddId)"
                    class="text-slate-500 hover:text-rose-400 text-xs mb-1 cursor-pointer"
                    title="Supprimer la sélection"
                  >
                    ✕
                  </button>
                  <span class="font-mono font-black text-sm text-cyan-300">
                    {{ item.oddValue.toFixed(2) }}
                  </span>
                </div>
              </div>

              <!-- Changed alert if odd fluctuated live -->
              @if (item.hasChanged) {
                <div class="mt-1.5 pt-1 border-t border-slate-900 flex items-center gap-1 text-[9px] text-amber-400 font-mono">
                  <span>⚡ Cote réévaluée en direct</span>
                </div>
              }
            </div>
          } @empty {
            <div class="p-8 text-center rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-slate-500 space-y-1.5">
              <span class="text-2xl">📋</span>
              <p class="text-xs font-semibold text-slate-400">Aucune sélection ajoutée</p>
              <p class="text-[10px] text-slate-500">Cliquez sur une cote du match pour préparer votre pari</p>
            </div>
          }
        </div>
      </div>

      <!-- Slip Footer & Stake Calculation -->
      @if (service.betSelections().length > 0) {
        <div class="pt-4 border-t border-slate-800/80 space-y-3.5 mt-4">
          
          <!-- Stake Quick Select -->
          <div>
            <div class="flex items-center justify-between text-xs text-slate-400 mb-1.5 font-medium">
              <span>Mise parier (€) :</span>
              <span class="font-mono font-bold text-white">{{ stake() }} €</span>
            </div>
            <div class="grid grid-cols-4 gap-1.5">
              @for (val of [5, 10, 20, 50]; track val) {
                <button
                  (click)="stake.set(val)"
                  class="py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer"
                  [ngClass]="{
                    'bg-cyan-500 text-black': stake() === val,
                    'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800': stake() !== val
                  }"
                >
                  {{ val }}€
                </button>
              }
            </div>
          </div>

          <!-- Total Odds & Potential Gain -->
          <div class="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-1.5">
            <div class="flex items-center justify-between text-xs text-slate-400">
              <span>Cote Totale :</span>
              <span class="font-mono font-black text-cyan-300 text-sm">{{ service.totalOdds() }}</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold text-white">Gain Potentiel :</span>
              <span class="font-mono font-black text-emerald-400 text-base">
                {{ (stake() * service.totalOdds()).toFixed(2) }} €
              </span>
            </div>
          </div>

          <!-- Validate Button -->
          <button
            (click)="showValidationModal.set(true)"
            class="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-400 hover:from-blue-500 hover:to-emerald-300 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20 active:scale-98 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>📱 Générer QR Code Point de Vente</span>
          </button>

          <!-- ANJ Legal Warning -->
          <p class="text-[9px] text-slate-500 text-center leading-tight">
            Interdit aux mineurs. Jouer comporte des risques : endettement, isolement. Appelez le 09 74 75 13 13 (appel non surtaxé).
          </p>

        </div>
      }

      <!-- QR Code Modal (Simulation Point de Vente FDJ) -->
      @if (showValidationModal()) {
        <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div class="glass-panel max-w-sm w-full rounded-2xl p-6 border border-cyan-500/40 shadow-2xl relative animate-scaleIn">
            
            <button
              (click)="showValidationModal.set(false)"
              class="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer text-lg font-bold"
            >
              ✕
            </button>

            <div class="text-center space-y-3">
              <div class="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto text-2xl">
                📱
              </div>
              <h4 class="text-base font-extrabold text-white">Ticket Point de Vente Validé</h4>
              <p class="text-xs text-slate-400">
                Présentez ce QR Code signé en bureau de tabac ou borne FDJ pour faire valider votre grille.
              </p>

              <!-- Mock QR Code SVG -->
              <div class="p-4 bg-white rounded-xl inline-block shadow-inner mx-auto">
                <svg class="w-36 h-36" viewBox="0 0 100 100" fill="none">
                  <!-- QR Code pattern representation -->
                  <rect width="100" height="100" fill="white" />
                  <rect x="10" y="10" width="24" height="24" fill="black" />
                  <rect x="14" y="14" width="16" height="16" fill="white" />
                  <rect x="18" y="18" width="8" height="8" fill="black" />

                  <rect x="66" y="10" width="24" height="24" fill="black" />
                  <rect x="70" y="14" width="16" height="16" fill="white" />
                  <rect x="74" y="18" width="8" height="8" fill="black" />

                  <rect x="10" y="66" width="24" height="24" fill="black" />
                  <rect x="14" y="70" width="16" height="16" fill="white" />
                  <rect x="18" y="74" width="8" height="8" fill="black" />

                  <rect x="40" y="20" width="8" height="16" fill="black" />
                  <rect x="52" y="12" width="6" height="20" fill="black" />
                  <rect x="42" y="44" width="18" height="18" fill="black" />
                  <rect x="46" y="48" width="10" height="10" fill="white" />
                  <rect x="68" y="48" width="20" height="8" fill="black" />
                  <rect x="72" y="66" width="16" height="20" fill="black" />
                  <rect x="40" y="70" width="14" height="14" fill="black" />
                </svg>
              </div>

              <!-- Ticket Details -->
              <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 text-left font-mono text-[11px] space-y-1">
                <div class="flex justify-between">
                  <span class="text-slate-500">Réf :</span>
                  <span class="text-cyan-300 font-bold">FDJ-PSPDV-2026-{{ randomTicketNum }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500">Mise :</span>
                  <span class="text-white">{{ stake() }} €</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500">Gain Max :</span>
                  <span class="text-emerald-400 font-bold">{{ (stake() * service.totalOdds()).toFixed(2) }} €</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500">Statut ANJ :</span>
                  <span class="text-blue-400">CERTIFIÉ CONFORME</span>
                </div>
              </div>

              <button
                (click)="showValidationModal.set(false)"
                class="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
              >
                Fermer
              </button>
            </div>

          </div>
        </div>
      }

    </div>
  `,
})
export class BetSlipComponent {
  readonly service = inject(SportsLiveService);
  readonly stake = signal<number>(10);
  readonly showValidationModal = signal<boolean>(false);
  readonly randomTicketNum = Math.floor(10000 + Math.random() * 90000);
}
