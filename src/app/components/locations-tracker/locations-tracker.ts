import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';
import { AppSettings } from '../../models/settings.model';
import { Subscription } from 'rxjs';
import { ParksStatesModal } from '../parks-states-modal/parks-states-modal';
import { NATIONAL_PARKS, STATES, GeoLocation } from '../../core/constants/geography.constants';

@Component({
  selector: 'app-locations-tracker',
  standalone: true,
  imports: [CommonModule, ParksStatesModal],
  templateUrl: './locations-tracker.html',
})
export class LocationsTrackerComponent implements OnInit, OnDestroy {
  mode: 'parks' | 'states' = 'parks';
  settings: AppSettings | null = null;
  showModal = false;

  private subs = new Subscription();

  constructor(private stateService: StateService) {}

  ngOnInit(): void {
    this.subs.add(
      this.stateService.mapMode$.subscribe((mode) => {
        if (mode === 'parks' || mode === 'states') {
          this.mode = mode;
        }
      }),
    );

    this.subs.add(
      this.stateService.settings$.subscribe((settings) => {
        this.settings = settings;
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  get visitedLocations(): {
    location: GeoLocation;
    members: import('../../models/settings.model').FamilyMember[];
  }[] {
    if (!this.settings) return [];

    const visits =
      this.mode === 'parks' ? this.settings.visitedParks! : this.settings.visitedStates!;
    const allLocs = this.mode === 'parks' ? NATIONAL_PARKS : STATES;

    const result = [];
    for (const [locId, visitDetails] of Object.entries(visits)) {
      if (visitDetails && visitDetails.length > 0) {
        const location = allLocs.find((l) => l.id === locId);
        if (location) {
          const memberIds = Array.from(new Set(visitDetails.map((v) => v.memberId)));
          const members = memberIds
            .map((id) => this.settings!.familyMembers.find((m) => m.id === id))
            .filter(
              (m): m is import('../../models/settings.model').FamilyMember => m !== undefined,
            );

          result.push({ location: location!, members });
        }
      }
    }

    return result.sort((a, b) => a.location.name.localeCompare(b.location.name));
  }

  openEditModal(): void {
    this.showModal = true;
  }
}
