import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LocationPoint } from '../models/location.model';
import { LoggerService } from '../core/services/logger.service';

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
    this.http
      .get<LocationPoint[]>('assets/data/parks.json')
      .pipe(tap((parks) => this.logger.info(`Loaded ${parks.length} parks`)))
      .subscribe({
        next: (data) => this.parksSubject.next(data),
        error: (err) => this.logger.error('Failed to load parks.json', err),
      });

    this.http
      .get<LocationPoint[]>('assets/data/states.json')
      .pipe(tap((states) => this.logger.info(`Loaded ${states.length} states`)))
      .subscribe({
        next: (data) => this.statesSubject.next(data),
        error: (err) => this.logger.error('Failed to load states.json', err),
      });
  }
}
