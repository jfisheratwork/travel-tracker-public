import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GlobalSearchComponent } from './global-search.component';
import { StateService } from '../../services/state.service';
import { ReactiveFormsModule } from '@angular/forms';
import { vi } from 'vitest';

describe('GlobalSearchComponent', () => {
  let component: GlobalSearchComponent;
  let fixture: ComponentFixture<GlobalSearchComponent>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let stateServiceSpy: any;

  beforeEach(async () => {
    vi.useFakeTimers();
    stateServiceSpy = {
      setSearchTerm: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [GlobalSearchComponent, ReactiveFormsModule],
      providers: [{ provide: StateService, useValue: stateServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(GlobalSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should debounce search input by 300ms', () => {
    component.searchControl.setValue('Yosemite');
    expect(stateServiceSpy.setSearchTerm).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);

    expect(stateServiceSpy.setSearchTerm).toHaveBeenCalledWith('Yosemite');
  });

  it('should clear search input when clearSearch is called', () => {
    component.searchControl.setValue('Yosemite');
    vi.advanceTimersByTime(300);
    expect(stateServiceSpy.setSearchTerm).toHaveBeenCalledWith('Yosemite');

    component.clearSearch();
    vi.advanceTimersByTime(300);

    expect(component.searchControl.value).toBe('');
    expect(stateServiceSpy.setSearchTerm).toHaveBeenCalledWith('');
  });
});
