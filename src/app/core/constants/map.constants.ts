export const MAP_THEME = {
  ROUTE_POLYLINE_COLOR: '#3b82f6', // Tailwind blue-500
  ROUTE_POLYLINE_WEIGHT: 4,
  ROUTE_POLYLINE_OPACITY: 0.8,
  HOMETOWN_COLOR: '#3b82f6', // Tailwind blue-500
};

export const STATE_SHADING_THEME = {
  PANE_NAME: 'stateShadingPane',
  PANE_Z_INDEX: '350',
  ALL_VISITED: {
    fillColor: '#22c55e', // Emerald 500
    fillOpacity: 0.35,
    color: '#16a34a', // Emerald 600
    weight: 1.5,
  },
  PARTIALLY_VISITED: {
    fillColor: '#f59e0b', // Amber 500
    fillOpacity: 0.3,
    color: '#d97706', // Amber 600
    weight: 1.5,
  },
  UNVISITED: {
    fillColor: '#d6d3d1', // Stone 300
    fillOpacity: 0.05,
    color: '#cbd5e1', // Slate 300
    weight: 0.75,
  },
  DIMMED: {
    fillColor: '#94a3b8',
    fillOpacity: 0.02,
    color: '#cbd5e1',
    weight: 0.5,
  },
  HOVER: {
    weight: 2.5,
    fillOpacityBoost: 0.15,
    maxOpacity: 0.6,
  },
};
