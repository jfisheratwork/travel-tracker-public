// DOCS: https://angular.dev/api/core/HostListener
import { Component, EventEmitter, HostListener, OnInit, Output, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';
import { AppSettings, FamilyMember } from '../../models/settings.model';
import { Subscription } from 'rxjs';
import { NATIONAL_PARKS, STATES } from '../../core/constants/geography.constants';
import {
  GLOBAL_COUNTRIES,
  COUNTRIES_MAP,
  TOTAL_GLOBAL_COUNTRIES,
} from '../../core/constants/countries.constants';
import { STATIC_PLACES_CATALOG } from '../../core/constants/curated-places.constants';

export interface MemberStat {
  member: FamilyMember;
  // Parks
  parksTotal: number;
  parksPct: number;
  usParks: number;
  usParksPct: number;
  caParks: number;
  caParksPct: number;

  // States
  statesTotal: number;
  statesPct: number;
  usStates: number;
  usStatesPct: number;
  caStates: number;
  caStatesPct: number;

  // Countries
  countriesTotal: number;
  countriesPct: number;

  // Roads
  routesCount: number;
  routesMiles: number;
  routesPct: number;
}

@Component({
  selector: 'app-stats-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stats-modal.html',
})
export class StatsModal implements OnInit, OnDestroy {
  @Output() close = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }

  activeTab: 'parks' | 'states' | 'countries' | 'roads' = 'parks';

  settings: AppSettings | null = null;
  private sub?: Subscription;

  // Constants
  readonly TOTAL_US_STATES = 50;
  readonly TOTAL_CA_PROVINCES = 13;
  readonly TOTAL_STATES = STATES.length;
  readonly TOTAL_COUNTRIES = TOTAL_GLOBAL_COUNTRIES;

  readonly TOTAL_US_PARKS = NATIONAL_PARKS.filter((p) => p.country !== 'Canada').length;
  readonly TOTAL_CA_PARKS = NATIONAL_PARKS.filter((p) => p.country === 'Canada').length;
  readonly TOTAL_PARKS = NATIONAL_PARKS.length;

  constructor(private stateService: StateService) {}

  ngOnInit(): void {
    this.sub = this.stateService.settings$.subscribe((settings) => {
      this.settings = settings;
    });
  }

  ngOnDestroy(): void {
    if (this.sub) this.sub.unsubscribe();
  }

  // --- Countries Metrics ---
  get visitedCountriesCount(): number {
    if (!this.settings) return 0;
    const visitedCountryCodes = new Set<string>();
    const visitedStates = this.settings.visitedStates || {};
    const placeVisits = this.settings.placeVisits || {};

    for (const c of GLOBAL_COUNTRIES) {
      const hasLegacy =
        (visitedStates[c.name] && visitedStates[c.name].length > 0) ||
        (visitedStates[c.id] && visitedStates[c.id].length > 0);
      const hasV4 =
        placeVisits[c.name]?.some((v) => v.status === 'visited') ||
        placeVisits[c.id]?.some((v) => v.status === 'visited');
      if (hasLegacy || hasV4) {
        visitedCountryCodes.add(c.id);
      }
    }

    if (this.visitedUSStatesCount > 0 || this.visitedUSParksCount > 0) {
      visitedCountryCodes.add('US');
    }
    if (this.visitedCAProvincesCount > 0 || this.visitedCAParksCount > 0) {
      visitedCountryCodes.add('CA');
    }

    const allPlaces = [...STATIC_PLACES_CATALOG, ...(this.settings.customPlaces || [])];
    for (const p of allPlaces) {
      if (placeVisits[p.id]?.some((v) => v.status === 'visited')) {
        if (COUNTRIES_MAP.has(p.countryId)) {
          visitedCountryCodes.add(p.countryId);
        }
      }
    }

    return visitedCountryCodes.size;
  }

  get totalCountriesPct(): number {
    return Math.round((this.visitedCountriesCount / this.TOTAL_COUNTRIES) * 100);
  }

  get remainingCountries(): number {
    return Math.max(0, this.TOTAL_COUNTRIES - this.visitedCountriesCount);
  }

  // --- States Metrics ---
  get visitedUSStatesCount(): number {
    if (!this.settings?.visitedStates) return 0;
    const usIds = STATES.filter((s) => s.sub !== 'Canada').map((s) => s.id);
    return Object.entries(this.settings.visitedStates).filter(
      ([id, visits]) => usIds.includes(id) && visits && visits.length > 0,
    ).length;
  }

  get visitedUSStatesPct(): number {
    return Math.round((this.visitedUSStatesCount / this.TOTAL_US_STATES) * 100);
  }

  get visitedCAProvincesCount(): number {
    if (!this.settings?.visitedStates) return 0;
    const caIds = STATES.filter((s) => s.sub === 'Canada').map((s) => s.id);
    return Object.entries(this.settings.visitedStates).filter(
      ([id, visits]) => caIds.includes(id) && visits && visits.length > 0,
    ).length;
  }

  get visitedCAProvincesPct(): number {
    return Math.round((this.visitedCAProvincesCount / this.TOTAL_CA_PROVINCES) * 100);
  }

  get totalStatesVisited(): number {
    return this.visitedUSStatesCount + this.visitedCAProvincesCount;
  }

  get totalStatesPct(): number {
    return Math.round((this.totalStatesVisited / this.TOTAL_STATES) * 100);
  }

  get remainingStates(): number {
    return Math.max(0, this.TOTAL_STATES - this.totalStatesVisited);
  }

  // --- Parks Metrics ---
  get visitedUSParksCount(): number {
    if (!this.settings?.visitedParks) return 0;
    const usIds = NATIONAL_PARKS.filter((p) => p.country !== 'Canada').map((p) => p.id);
    return Object.entries(this.settings.visitedParks).filter(
      ([id, visits]) => usIds.includes(id) && visits && visits.length > 0,
    ).length;
  }

  get visitedUSParksPct(): number {
    return Math.round((this.visitedUSParksCount / this.TOTAL_US_PARKS) * 100);
  }

  get visitedCAParksCount(): number {
    if (!this.settings?.visitedParks) return 0;
    const caIds = NATIONAL_PARKS.filter((p) => p.country === 'Canada').map((p) => p.id);
    return Object.entries(this.settings.visitedParks).filter(
      ([id, visits]) => caIds.includes(id) && visits && visits.length > 0,
    ).length;
  }

  get visitedCAParksPct(): number {
    return Math.round((this.visitedCAParksCount / this.TOTAL_CA_PARKS) * 100);
  }

  get totalParksVisited(): number {
    return this.visitedUSParksCount + this.visitedCAParksCount;
  }

  get totalParksPct(): number {
    return Math.round((this.totalParksVisited / this.TOTAL_PARKS) * 100);
  }

  get remainingParks(): number {
    return Math.max(0, this.TOTAL_PARKS - this.totalParksVisited);
  }

  // --- Road Trips Metrics ---
  get completedRoutesCount(): number {
    return this.settings?.savedRoutes?.filter((r) => r.status === 'completed').length || 0;
  }

  get plannedRoutesCount(): number {
    return this.settings?.savedRoutes?.filter((r) => r.status === 'planned').length || 0;
  }

  get totalRoutesCount(): number {
    return this.completedRoutesCount + this.plannedRoutesCount;
  }

  get routesCompletionPct(): number {
    if (!this.totalRoutesCount) return 0;
    return Math.round((this.completedRoutesCount / this.totalRoutesCount) * 100);
  }

  get totalCompletedMiles(): number {
    const METERS_PER_MILE = 1609.34;
    const meters =
      this.settings?.savedRoutes
        ?.filter((r) => r.status === 'completed')
        .reduce((sum, r) => sum + (r.distance || 0), 0) || 0;
    return Math.round(meters / METERS_PER_MILE);
  }

  get totalCompletedHours(): number {
    const SECONDS_PER_HOUR = 3600;
    const seconds =
      this.settings?.savedRoutes
        ?.filter((r) => r.status === 'completed')
        .reduce((sum, r) => sum + (r.duration || 0), 0) || 0;
    return Math.round((seconds / SECONDS_PER_HOUR) * 10) / 10;
  }

  // --- Per-Member Metrics ---
  get memberStats(): MemberStat[] {
    if (!this.settings?.familyMembers?.length) return [];
    const METERS_PER_MILE = 1609.34;

    const usParkIds = new Set(
      NATIONAL_PARKS.filter((p) => p.country !== 'Canada').map((p) => p.id),
    );
    const caParkIds = new Set(
      NATIONAL_PARKS.filter((p) => p.country === 'Canada').map((p) => p.id),
    );
    const usStateIds = new Set(STATES.filter((s) => s.sub !== 'Canada').map((s) => s.id));
    const caStateIds = new Set(STATES.filter((s) => s.sub === 'Canada').map((s) => s.id));
    const allPlaces = [...STATIC_PLACES_CATALOG, ...(this.settings.customPlaces || [])];
    const placeVisits = this.settings.placeVisits || {};

    return this.settings.familyMembers.map((member) => {
      // Parks breakdown
      let usParks = 0;
      let caParks = 0;
      if (this.settings?.visitedParks) {
        for (const [id, visits] of Object.entries(this.settings.visitedParks)) {
          if (visits.some((v) => v.memberId === member.id)) {
            if (usParkIds.has(id)) usParks++;
            else if (caParkIds.has(id)) caParks++;
          }
        }
      }
      const parksTotal = usParks + caParks;

      // States breakdown
      let usStates = 0;
      let caStates = 0;
      if (this.settings?.visitedStates) {
        for (const [id, visits] of Object.entries(this.settings.visitedStates)) {
          if (visits.some((v) => v.memberId === member.id)) {
            if (usStateIds.has(id)) usStates++;
            else if (caStateIds.has(id)) caStates++;
          }
        }
      }
      const statesTotal = usStates + caStates;

      // Countries breakdown
      const memberCountryCodes = new Set<string>();
      for (const c of GLOBAL_COUNTRIES) {
        const hasLegacy =
          this.settings?.visitedStates?.[c.name]?.some((v) => v.memberId === member.id) ||
          this.settings?.visitedStates?.[c.id]?.some((v) => v.memberId === member.id);
        const hasV4 =
          placeVisits[c.name]?.some((v) => v.memberId === member.id && v.status === 'visited') ||
          placeVisits[c.id]?.some((v) => v.memberId === member.id && v.status === 'visited');
        if (hasLegacy || hasV4) {
          memberCountryCodes.add(c.id);
        }
      }
      if (usStates > 0 || usParks > 0) memberCountryCodes.add('US');
      if (caStates > 0 || caParks > 0) memberCountryCodes.add('CA');

      for (const p of allPlaces) {
        if (placeVisits[p.id]?.some((v) => v.memberId === member.id && v.status === 'visited')) {
          if (COUNTRIES_MAP.has(p.countryId)) {
            memberCountryCodes.add(p.countryId);
          }
        }
      }
      const countriesTotal = memberCountryCodes.size;

      // Routes breakdown
      let routesCount = 0;
      let routesMeters = 0;
      if (this.settings?.savedRoutes) {
        this.settings.savedRoutes.forEach((route) => {
          if (
            route.status === 'completed' &&
            route.members &&
            (route.members.includes(member.name) || route.members.includes(member.id))
          ) {
            routesCount++;
            routesMeters += route.distance || 0;
          }
        });
      }

      return {
        member,
        parksTotal,
        parksPct: Math.round((parksTotal / this.TOTAL_PARKS) * 100),
        usParks,
        usParksPct: Math.round((usParks / this.TOTAL_US_PARKS) * 100),
        caParks,
        caParksPct: Math.round((caParks / this.TOTAL_CA_PARKS) * 100),

        statesTotal,
        statesPct: Math.round((statesTotal / this.TOTAL_STATES) * 100),
        usStates,
        usStatesPct: Math.round((usStates / this.TOTAL_US_STATES) * 100),
        caStates,
        caStatesPct: Math.round((caStates / this.TOTAL_CA_PROVINCES) * 100),

        countriesTotal,
        countriesPct: Math.round((countriesTotal / this.TOTAL_COUNTRIES) * 100),

        routesCount,
        routesMiles: Math.round(routesMeters / METERS_PER_MILE),
        routesPct: this.completedRoutesCount
          ? Math.round((routesCount / this.completedRoutesCount) * 100)
          : 0,
      };
    });
  }
}
