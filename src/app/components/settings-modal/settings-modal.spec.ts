import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SettingsModal } from './settings-modal';
import { StateService } from '../../services/state.service';
import { DEFAULT_SETTINGS } from '../../models/settings.model';

describe('SettingsModal', () => {
  let component: SettingsModal;
  let fixture: ComponentFixture<SettingsModal>;
  let stateService: StateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsModal],
      providers: [StateService],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsModal);
    component = fixture.componentInstance;
    stateService = TestBed.inject(StateService);
    stateService.updateSettings({ ...DEFAULT_SETTINGS, familyMembers: [], hometowns: [] });

    // We must call detectChanges or lifecycle methods manually if we want ngOnInit to run
    // before we assert on it. Wait for stable.
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should clone the state to viewModel on init', () => {
    expect(component.viewModel).toBeTruthy();
    expect(component.viewModel.familyMembers).toEqual([]);
  });

  it('should only update state on save, not during edits', () => {
    component.newMemberName = 'Test Member';
    component.addFamilyMember();

    expect(component.viewModel.familyMembers.length).toBe(1);

    // State service should not be updated yet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let currentState: any;
    stateService.settings$.subscribe((s) => (currentState = s)).unsubscribe();
    expect(currentState.familyMembers.length).toBe(0);

    // After save, it should be updated
    component.save();
    stateService.settings$.subscribe((s) => (currentState = s)).unsubscribe();
    expect(currentState.familyMembers.length).toBe(1);
    expect(currentState.familyMembers[0].name).toBe('Test Member');
  });

  it('should add multiple hometowns without crashing', () => {
    component.hometownQuery = 'Seattle';
    component.addHometown({ name: 'Seattle, WA', lat: 47, lng: -122 });

    expect(component.viewModel.hometowns.length).toBe(1);

    component.hometownQuery = 'Portland';
    component.addHometown({ name: 'Portland, OR', lat: 45, lng: -122 });

    expect(component.viewModel.hometowns.length).toBe(2);
  });

  it('should support adding members using a comma-separated list', () => {
    component.newMemberName = 'Alice, Bob, Charlie';
    component.addFamilyMember();

    expect(component.viewModel.familyMembers.length).toBe(3);
    expect(component.viewModel.familyMembers.map((m) => m.name)).toEqual([
      'Alice',
      'Bob',
      'Charlie',
    ]);
    expect(component.newMemberName).toBe('');

    // Adding existing names should ignore duplicates case-insensitively
    component.newMemberName = 'alice, David';
    component.addFamilyMember();
    expect(component.viewModel.familyMembers.length).toBe(4);
    expect(component.viewModel.familyMembers[3].name).toBe('David');
  });
});
