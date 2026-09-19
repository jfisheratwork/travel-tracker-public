export const MAP_THEME = {
  ROUTE_POLYLINE_COLOR: '#3b82f6', // Tailwind blue-500
  ROUTE_POLYLINE_WEIGHT: 4,
  ROUTE_POLYLINE_OPACITY: 0.8,
  HOMETOWN_COLOR: '#3b82f6', // Tailwind blue-500
  WANT_TO_VISIT_COLOR: '#8b5cf6', // Vivid Violet / Purple
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

export const MAP_MARKER_THEME = {
  PARK: {
    DIAMETER: 22,
    ANCHOR: 11,
    FONT_SIZE: '12px',
    BG_COLOR: '#eaf5ea',
    BORDER: '1.5px solid white',
    BORDER_ALL: '2.5px solid #22c55e',
    BORDER_SOME: '2.5px solid #f59e0b',
    BORDER_NONE: '1.5px solid #94a3b8',
    BOX_SHADOW: '0 1.5px 3px rgba(0,0,0,0.28)',
    BOX_SHADOW_ALL: '0 2px 5px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.8)',
    BOX_SHADOW_SOME: '0 2px 5px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.8)',
    BOX_SHADOW_NONE: '0 1px 3px rgba(0,0,0,0.15)',
    ICON_CHAR: '⛰️',
    ICON_CHAR_US: '⛰️',
    ICON_CHAR_CA: '🏔️',
  },
  STATE: {
    DIAMETER: 20,
    ANCHOR: 10,
    FONT_SIZE: '12px',
    BORDER: '1.5px solid white',
    BORDER_ALL: '2.5px solid #22c55e',
    BORDER_SOME: '2.5px solid #f59e0b',
    BORDER_NONE: '2px solid #94a3b8',
    BOX_SHADOW: '0 1.5px 3px rgba(0,0,0,0.28)',
    BOX_SHADOW_ALL: '0 2px 5px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.4)',
    BOX_SHADOW_SOME: '0 2px 5px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.4)',
    BOX_SHADOW_NONE: '0 1px 3px rgba(0,0,0,0.2)',
    ICON_CHAR: '★',
    ICON_CHAR_US: '🇺🇸',
    ICON_CHAR_CA: '🇨🇦',
  },
  HOMETOWN: {
    DIAMETER: 24,
    ANCHOR: 12,
    POPUP_OFFSET_Y: -15,
    FONT_SIZE: '14px',
    BORDER: '2px solid white',
    BOX_SHADOW: '0 2px 4px rgba(0,0,0,0.3)',
    ICON_CHAR: '🏠',
    ACTIVE_COLOR: '#3b82f6',
    PREVIOUS_COLOR: '#9ca3af',
  },
};
