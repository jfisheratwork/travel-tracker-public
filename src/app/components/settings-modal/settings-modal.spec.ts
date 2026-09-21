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

  it('should reorder family members up and down', () => {
    component.newMemberName = 'Alice, Bob, Charlie';
    component.addFamilyMember();

    // Move Bob up (index 1 -> 0)
    component.moveFamilyMember(1, 'up');
    expect(component.viewModel.familyMembers.map((m) => m.name)).toEqual([
      'Bob',
      'Alice',
      'Charlie',
    ]);

    // Move Bob down (index 0 -> 1)
    component.moveFamilyMember(0, 'down');
    expect(component.viewModel.familyMembers.map((m) => m.name)).toEqual([
      'Alice',
      'Bob',
      'Charlie',
    ]);

    // Out of bounds up (index 0 -> -1) should be a no-op
    component.moveFamilyMember(0, 'up');
    expect(component.viewModel.familyMembers.map((m) => m.name)).toEqual([
      'Alice',
      'Bob',
      'Charlie',
    ]);

    // Out of bounds down (index 2 -> 3) should be a no-op
    component.moveFamilyMember(2, 'down');
    expect(component.viewModel.familyMembers.map((m) => m.name)).toEqual([
      'Alice',
      'Bob',
      'Charlie',
    ]);
  });

  it('should reorder hometowns up and down', () => {
    component.addHometown({ name: 'Seattle, WA', lat: 47, lng: -122 });
    component.addHometown({ name: 'Portland, OR', lat: 45, lng: -122 });
    component.addHometown({ name: 'San Francisco, CA', lat: 37, lng: -122 });

    // Move San Francisco up (index 2 -> 1)
    component.moveHometown(2, 'up');
    expect(component.viewModel.hometowns.map((h) => h.name)).toEqual([
      'Seattle, WA',
      'San Francisco, CA',
      'Portland, OR',
    ]);

    // Move Seattle down (index 0 -> 1)
    component.moveHometown(0, 'down');
    expect(component.viewModel.hometowns.map((h) => h.name)).toEqual([
      'San Francisco, CA',
      'Seattle, WA',
      'Portland, OR',
    ]);
  });

  it('should correctly report isMapboxActive and isCartoActive', () => {
    component.viewModel.mapboxKey = '';
    component.viewModel.cartoKey = '';
    // If environment has key, it uses env key; if custom key is provided, it uses custom key
    component.viewModel.mapboxKey = 'pk.custom_token_123';
    expect(component.isMapboxActive).toBe(true);

    component.viewModel.cartoKey = 'cb1_custom_key_456';
    expect(component.isCartoActive).toBe(true);
  });
});
