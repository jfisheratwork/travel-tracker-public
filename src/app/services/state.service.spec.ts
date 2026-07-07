import { TestBed } from '@angular/core/testing';
import { StateService } from './state.service';
import { firstValueFrom } from 'rxjs';

describe('StateService', () => {
  let service: StateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with an empty search term', async () => {
    const term = await firstValueFrom(service.searchTerm$);
    expect(term).toBe('');
  });

  it('should correctly update the search term', async () => {
    service.setSearchTerm('Yosemite');
    const term = await firstValueFrom(service.searchTerm$);
    expect(term).toBe('Yosemite');
  });
});
