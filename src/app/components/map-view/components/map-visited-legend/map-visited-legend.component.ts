import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColorThemeDefinition } from '../../../../core/constants/theme.constants';
import { MAP_THEME } from '../../../../core/constants/map.constants';

/**
 * Presentational overlay component displaying visited status legend swatches
 * on the bottom-right corner of the map.
 */
@Component({
  selector: 'app-map-visited-legend',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map-visited-legend.component.html',
})
export class MapVisitedLegendComponent {
  @Input({ required: true }) theme!: ColorThemeDefinition;
  @Input() wantToVisitColor: string = MAP_THEME.WANT_TO_VISIT_COLOR;
}
