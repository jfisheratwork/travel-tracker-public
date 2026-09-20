import { describe, it, expect } from 'vitest';
import * as L from 'leaflet';
import { MapMarkerService } from './map-marker.service';
import {
  MAP_THEME,
  MAP_MARKER_THEME,
  PARK_MOUNTAIN_PEAK_SVG,
  PARK_MOUNTAIN_GLACIER_SVG,
  US_CAPITOL_DOME_SVG,
  CA_LEGISLATIVE_BLDG_SVG,
} from '../../../core/constants/map.constants';
import { COLOR_THEMES, DEFAULT_THEME_ID } from '../../../core/constants/theme.constants';
import { LocationPoint } from '../../../models/location.model';

describe('MapMarkerService', () => {
  const service = new MapMarkerService();
  const defaultTheme = COLOR_THEMES[DEFAULT_THEME_ID];

  const createLayerGroupMock = () => {
    const layers: L.Layer[] = [];
    return {
      clearLayers: () => {
        layers.length = 0;
      },
      addLayer: (layer: L.Layer) => {
        layers.push(layer);
      },
      getLayers: () => layers,
    } as unknown as L.LayerGroup;
  };

  it('should render Option 4 solid green disc for all-visited parks', () => {
    const layerGroup = createLayerGroupMock();
    const locations: (LocationPoint & { isAllVisited?: boolean })[] = [
      {
        id: 'park-yosemite',
        name: 'Yosemite',
        region: 'CA',
        lat: 37.8651,
        lng: -119.5383,
        visited: true,
        isAllVisited: true,
        visitedBy: ['1', '2'],
        country: 'United States',
      },
    ];

    service.renderMarkers({
      layerGroup,
      locations,
      searchTerm: '',
      mapMode: 'parks',
      currentTheme: defaultTheme,
      familyMembers: [],
    });

    const layers = (layerGroup as unknown as { getLayers: () => L.Marker[] }).getLayers();
    expect(layers.length).toBe(1);
    const marker = layers[0];
    const iconHtml = (marker.getIcon().options as L.DivIconOptions).html as string;

    expect(iconHtml).toContain(`background-color:${defaultTheme.markerVisitedColor}`);
    expect(iconHtml).toContain('border: 2px solid white');
    expect(iconHtml).toContain(PARK_MOUNTAIN_PEAK_SVG);
    expect(marker.options.zIndexOffset).toBe(500);
  });

  it('should render Option 4 solid amber disc for partially visited parks', () => {
    const layerGroup = createLayerGroupMock();
    const locations: (LocationPoint & { isPartiallyVisited?: boolean })[] = [
      {
        id: 'park-yellowstone',
        name: 'Yellowstone',
        region: 'WY',
        lat: 44.428,
        lng: -110.5885,
        visited: false,
        isPartiallyVisited: true,
        visitedBy: ['1'],
        country: 'United States',
      },
    ];

    service.renderMarkers({
      layerGroup,
      locations,
      searchTerm: '',
      mapMode: 'parks',
      currentTheme: defaultTheme,
      familyMembers: [],
    });

    const layers = (layerGroup as unknown as { getLayers: () => L.Marker[] }).getLayers();
    expect(layers.length).toBe(1);
    const marker = layers[0];
    const iconHtml = (marker.getIcon().options as L.DivIconOptions).html as string;

    expect(iconHtml).toContain(`background-color:${defaultTheme.markerPartialColor}`);
    expect(iconHtml).toContain('border: 2px solid white');
    expect(iconHtml).toContain(PARK_MOUNTAIN_PEAK_SVG);
    expect(marker.options.zIndexOffset).toBe(400);
  });

  it('should render Option 4 frosted translucent slate with dashed border for unvisited parks', () => {
    const layerGroup = createLayerGroupMock();
    const locations: LocationPoint[] = [
      {
        id: 'park-acadia',
        name: 'Acadia',
        region: 'ME',
        lat: 44.3386,
        lng: -68.2733,
        visited: false,
        visitedBy: [],
        country: 'United States',
      },
    ];

    service.renderMarkers({
      layerGroup,
      locations,
      searchTerm: '',
      mapMode: 'parks',
      currentTheme: defaultTheme,
      familyMembers: [],
    });

    const layers = (layerGroup as unknown as { getLayers: () => L.Marker[] }).getLayers();
    expect(layers.length).toBe(1);
    const marker = layers[0];
    const iconHtml = (marker.getIcon().options as L.DivIconOptions).html as string;

    expect(iconHtml).toContain(`background-color:${MAP_MARKER_THEME.PARK.UNVISITED_BG}`);
    expect(iconHtml).toContain(`border: ${MAP_MARKER_THEME.PARK.BORDER_NONE}`);
    expect(iconHtml).toContain(`opacity: ${MAP_MARKER_THEME.PARK.UNVISITED_OPACITY}`);
    expect(iconHtml).toContain('color:#cbd5e1');
    expect(marker.options.zIndexOffset).toBe(0);
  });

  it('should render Style B Want to Visit violet disc and golden star pip for parks', () => {
    const layerGroup = createLayerGroupMock();
    const locations: (LocationPoint & { wantToVisit?: boolean })[] = [
      {
        id: 'park-glacier',
        name: 'Glacier',
        region: 'MT',
        lat: 48.7596,
        lng: -113.787,
        visited: false,
        wantToVisit: true,
        visitedBy: [],
        country: 'United States',
      },
    ];

    service.renderMarkers({
      layerGroup,
      locations,
      searchTerm: '',
      mapMode: 'parks',
      currentTheme: defaultTheme,
      familyMembers: [],
    });

    const layers = (layerGroup as unknown as { getLayers: () => L.Marker[] }).getLayers();
    expect(layers.length).toBe(1);
    const marker = layers[0];
    const iconHtml = (marker.getIcon().options as L.DivIconOptions).html as string;

    expect(iconHtml).toContain(`background-color:${MAP_THEME.WANT_TO_VISIT_COLOR}`);
    expect(iconHtml).toContain('want-to-visit-star');
    expect(iconHtml).toContain('★');
    expect(iconHtml).toContain(PARK_MOUNTAIN_PEAK_SVG);
    expect(marker.options.zIndexOffset).toBe(450);
  });

  it('should render Style B Want to Visit violet disc and golden star pip for state capitals', () => {
    const layerGroup = createLayerGroupMock();
    const locations: (LocationPoint & { wantToVisit?: boolean })[] = [
      {
        id: 'state-wa',
        name: 'Olympia',
        region: 'WA',
        lat: 47.0425,
        lng: -122.8931,
        visited: false,
        wantToVisit: true,
        visitedBy: [],
        country: 'United States',
      },
    ];

    service.renderMarkers({
      layerGroup,
      locations,
      searchTerm: '',
      mapMode: 'states',
      currentTheme: defaultTheme,
      familyMembers: [],
    });

    const layers = (layerGroup as unknown as { getLayers: () => L.Marker[] }).getLayers();
    expect(layers.length).toBe(1);
    const marker = layers[0];
    const iconHtml = (marker.getIcon().options as L.DivIconOptions).html as string;

    expect(iconHtml).toContain(`background-color:${MAP_THEME.WANT_TO_VISIT_COLOR}`);
    expect(iconHtml).toContain('want-to-visit-star');
    expect(iconHtml).toContain('★');
    expect(iconHtml).toContain(US_CAPITOL_DOME_SVG);
    expect(marker.options.zIndexOffset).toBe(450);
  });

  it('should use Canadian SVG icons for Canadian parks and provincial capitals', () => {
    const layerGroup = createLayerGroupMock();
    const locations: (LocationPoint & { wantToVisit?: boolean })[] = [
      {
        id: 'park-banff',
        name: 'Banff',
        region: 'AB',
        lat: 51.1784,
        lng: -115.5708,
        visited: false,
        wantToVisit: true,
        visitedBy: [],
        country: 'Canada',
      },
      {
        id: 'state-victoria',
        name: 'Victoria',
        region: 'BC',
        lat: 48.4284,
        lng: -123.3656,
        visited: false,
        wantToVisit: true,
        visitedBy: [],
        country: 'Canada',
      },
    ];

    // Check Canadian park
    service.renderMarkers({
      layerGroup,
      locations: [locations[0]],
      searchTerm: '',
      mapMode: 'parks',
      currentTheme: defaultTheme,
      familyMembers: [],
    });
    let layers = (layerGroup as unknown as { getLayers: () => L.Marker[] }).getLayers();
    let iconHtml = (layers[0].getIcon().options as L.DivIconOptions).html as string;
    expect(iconHtml).toContain(PARK_MOUNTAIN_GLACIER_SVG);

    // Check Canadian provincial capital
    service.renderMarkers({
      layerGroup,
      locations: [locations[1]],
      searchTerm: '',
      mapMode: 'states',
      currentTheme: defaultTheme,
      familyMembers: [],
    });
    layers = (layerGroup as unknown as { getLayers: () => L.Marker[] }).getLayers();
    iconHtml = (layers[0].getIcon().options as L.DivIconOptions).html as string;
    expect(iconHtml).toContain(CA_LEGISLATIVE_BLDG_SVG);
  });
});
