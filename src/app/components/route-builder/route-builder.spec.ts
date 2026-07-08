import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RouteBuilderComponent } from './route-builder';
import { RoutingService } from '../../services/routing/routing.service';
import { LocalStorageService } from '../../services/local-storage.service';
import { StateService } from '../../services/state.service';
import { of, throwError } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ReactiveFormsModule } from '@angular/forms';

describe('RouteBuilderComponent', () => {
  let component: RouteBuilderComponent;
  let fixture: ComponentFixture<RouteBuilderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouteBuilderComponent, HttpClientTestingModule, ReactiveFormsModule],
      providers: [RoutingService, LocalStorageService, StateService],
    }).compileComponents();

    fixture = TestBed.createComponent(RouteBuilderComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
