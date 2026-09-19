import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { MapVisitedLegendComponent } from './map-visited-legend.component';
import { COLOR_THEMES, DEFAULT_THEME_ID } from '../../../../core/constants/theme.constants';

describe('MapVisitedLegendComponent', () => {
  let component: MapVisitedLegendComponent;
  let fixture: ComponentFixture<MapVisitedLegendComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapVisitedLegendComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MapVisitedLegendComponent);
    component = fixture.componentInstance;
    component.theme = COLOR_THEMES[DEFAULT_THEME_ID];
    fixture.detectChanges();
  });

  it('should create and display visited status labels', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('VISITED');
    expect(compiled.textContent).toContain('Everyone');
    expect(compiled.textContent).toContain('Some of us');
    expect(compiled.textContent).toContain('Not yet');
    expect(compiled.textContent).toContain('Want to visit');
  });
});
