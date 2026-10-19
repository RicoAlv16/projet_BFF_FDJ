import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from './components/navbar/navbar.component';
import { PipelineVisualizerComponent } from './components/pipeline-visualizer/pipeline-visualizer.component';
import { LiveMatchCenterComponent } from './components/live-match-center/live-match-center.component';
import { SimulationConsoleComponent } from './components/simulation-console/simulation-console.component';
import { MatchEventsTimelineComponent } from './components/match-events-timeline/match-events-timeline.component';
import { BetSlipComponent } from './components/bet-slip/bet-slip.component';
import { TelemetryTerminalComponent } from './components/telemetry-terminal/telemetry-terminal.component';
import { SportsLiveService } from './services/sports-live.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    NavbarComponent,
    PipelineVisualizerComponent,
    LiveMatchCenterComponent,
    SimulationConsoleComponent,
    MatchEventsTimelineComponent,
    BetSlipComponent,
    TelemetryTerminalComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly service = inject(SportsLiveService);
}
