import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColorThemeDefinition } from '../../../../core/constants/theme.constants';
import {
  TOTAL_US_STATES,
  TOTAL_CA_PROVINCES,
  TOTAL_US_PARKS,
  TOTAL_CA_PARKS,
} from '../../../../core/constants/geography.constants';

/**
 * Presentational overlay component displaying visited statistics counters
 * on the bottom-left corner of the map.
 */
@Component({
  selector: 'app-map-stats-legend',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map-stats-legend.component.html',
})
export class MapStatsLegendComponent {
  @Input({ required: true }) theme!: ColorThemeDefinition;
  @Input() inline = false;
  @Input() visitedUSStatesCount = 0;
  @Input() visitedCAProvincesCount = 0;
  @Input() visitedUSParksCount = 0;
  @Input() visitedCAParksCount = 0;

  readonly TOTAL_US_STATES = TOTAL_US_STATES;
  readonly TOTAL_CA_PROVINCES = TOTAL_CA_PROVINCES;
  readonly TOTAL_US_PARKS = TOTAL_US_PARKS;
  readonly TOTAL_CA_PARKS = TOTAL_CA_PARKS;
}
