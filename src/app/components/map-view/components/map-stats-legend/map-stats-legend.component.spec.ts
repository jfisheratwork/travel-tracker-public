import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { MapStatsLegendComponent } from './map-stats-legend.component';
import { COLOR_THEMES, DEFAULT_THEME_ID } from '../../../../core/constants/theme.constants';

describe('MapStatsLegendComponent', () => {
  let component: MapStatsLegendComponent;
  let fixture: ComponentFixture<MapStatsLegendComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapStatsLegendComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MapStatsLegendComponent);
    component = fixture.componentInstance;
    component.theme = COLOR_THEMES[DEFAULT_THEME_ID];
    component.visitedUSStatesCount = 12;
    component.visitedCAProvincesCount = 3;
    component.visitedUSParksCount = 5;
    component.visitedCAParksCount = 1;
    fixture.detectChanges();
  });

  it('should create and render statistics', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('12 / 50');
    expect(compiled.textContent).toContain('3 / 13');
    expect(compiled.textContent).toContain('5 / 63');
    expect(compiled.textContent).toContain(`1 / ${component.TOTAL_CA_PARKS}`);
  });
});
