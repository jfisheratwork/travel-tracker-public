import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HelpModalComponent } from './help-modal.component';

describe('HelpModalComponent', () => {
  let component: HelpModalComponent;
  let fixture: ComponentFixture<HelpModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HelpModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HelpModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit close on Escape key', () => {
    const spy = vi.fn();
    component.close.subscribe(spy);

    component.onEscapeKey();
    expect(spy).toHaveBeenCalled();
  });

  it('should emit close on backdrop click', () => {
    const spy = vi.fn();
    component.close.subscribe(spy);

    const backdrop = fixture.nativeElement.querySelector('[role="dialog"]');
    backdrop.click();

    expect(spy).toHaveBeenCalled();
  });

  it('should render GitHub issues link and open source attributions', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const issuesLink = compiled.querySelector('a[href*="github.com"][href*="issues"]');
    expect(issuesLink).toBeTruthy();

    const attributions = compiled.querySelectorAll('li');
    expect(attributions.length).toBeGreaterThan(5);
  });
});
