import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { LocationPoint } from '../models/location.model';
import { LoggerService } from '../core/services/logger.service';
import { NATIONAL_PARKS, STATES } from '../core/constants/geography.constants';

@Injectable({
  providedIn: 'root',
})
export class LocationDataService {
  private http = inject(HttpClient);
  private logger = inject(LoggerService);

  private parksSubject = new BehaviorSubject<LocationPoint[]>([]);
  public readonly parks$ = this.parksSubject.asObservable();

  private statesSubject = new BehaviorSubject<LocationPoint[]>([]);
  public readonly states$ = this.statesSubject.asObservable();

  constructor() {
    this.loadData();
  }

  private loadData() {
    this.parksSubject.next(
      NATIONAL_PARKS.map((p) => ({
        id: `park-${p.id}`,
        name: p.name,
        lat: p.lat,
        lng: p.lng,
        region: p.sub || '',
        visited: false,
        visitedBy: [],
      })),
    );

    this.statesSubject.next(
      STATES.map((s) => ({
        id: `state-${s.id}`,
        name: s.name,
        lat: s.lat,
        lng: s.lng,
        region: s.sub || '',
        visited: false,
        visitedBy: [],
      })),
    );
  }
}
