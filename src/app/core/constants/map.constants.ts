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

/**
 * Classical Capitol Dome Rotunda SVG (Option 2 - US State Capitals).
 * Features a tall cupola lantern, soaring dome curve, drum rotunda with colonnade, and base steps.
 */
export const US_CAPITOL_DOME_SVG =
  '<svg viewBox="0 0 24 24" width="13" height="13" fill-rule="evenodd" fill="currentColor" class="inline-block"><path d="M11.25 1h1.5v2h-1.5z M10 3h4v1.5h-4z M10.5 4.5h3v1.5h-3z M6 12C6 7 8.5 6 12 6C15.5 6 18 7 18 12z M5 12h14v1.5H5z M6 13.5h12v4H6z M7.7 14.3h1.2v2.5H7.7z M10.3 14.3h1.2v2.5h-1.2z M12.9 14.3h1.2v2.5h-1.2z M15.5 14.3h1.2v2.5h-1.2z M4.5 17.5h15v1.8h-15z M2.5 19.3h19v2h-19z"/></svg>';

/**
 * Provincial Legislative Building SVG (Option 2 - Canada Provincial Capitals).
 * Features a stately central dome and pediment with symmetrical horizontal wings and column bays.
 */
export const CA_LEGISLATIVE_BLDG_SVG =
  '<svg viewBox="0 0 24 24" width="13" height="13" fill-rule="evenodd" fill="currentColor" class="inline-block"><path d="M11.5 1.8h1v2.2h-1z M10 4.5C10 3.5 11 3 12 3C13 3 14 3.5 14 4.5z M8.5 8L12 5.2L15.5 8z M8.5 8h7v9h-7z M9.8 9.5h1.4v5.5H9.8z M12.8 9.5h1.4v5.5h-1.4z M1.5 9.2h7v7.8h-7z M3 10.8h1.8v4.5H3z M5.8 10.8h1.8v4.5H5.8z M15.5 9.2h7v7.8h-7z M17 10.8h1.8v4.5H17z M19.8 10.8h1.8v4.5h-1.8z M1 17h22v2H1z M0.5 19h23v2H0.5z"/></svg>';

/**
 * US National Park Mountain Peak SVG (Option 4 / Option 1 Style).
 * Crisp twin peaks with ridge facets.
 */
export const PARK_MOUNTAIN_PEAK_SVG =
  '<svg viewBox="0 0 24 24" width="13" height="13" fill-rule="evenodd" fill="currentColor" class="inline-block"><path d="M12 2L2 19h20L12 2zm0 4.2L18.5 17H5.5L12 6.2z M10 11l-2 3.5h4L10 11z"/></svg>';

/**
 * Canadian National Park Glacial Peak SVG.
 * High-relief glacial peak with sharp ridgeline.
 */
export const PARK_MOUNTAIN_GLACIER_SVG =
  '<svg viewBox="0 0 24 24" width="13" height="13" fill-rule="evenodd" fill="currentColor" class="inline-block"><path d="M12 2L3 18h18L12 2zm0 3.8l5.2 10.2H6.8L12 5.8z M11 11l-2 3.5h4L11 11z"/></svg>';

/**
 * Golden Star Pip for "Want to Visit" / Wishlist Markers (Style B).
 */
export const WANT_TO_VISIT_STAR_PIP_HTML =
  '<div class="want-to-visit-star" style="position: absolute; top: -5px; right: -5px; background-color: #fbbf24; color: #78350f; font-size: 8.5px; font-weight: 800; width: 13px; height: 13px; border-radius: 50%; border: 1.5px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.45); z-index: 10; line-height: 1; pointer-events: none;">★</div>';

export const MAP_MARKER_THEME = {
  PARK: {
    DIAMETER: 22,
    ANCHOR: 11,
    FONT_SIZE: '12px',
    BG_COLOR: '#eaf5ea',
    BORDER: '2px solid white',
    BORDER_ALL: '2px solid white',
    BORDER_SOME: '2px solid white',
    BORDER_WANT: '2px solid white',
    BORDER_NONE: '1.5px dashed #cbd5e1',
    BOX_SHADOW: '0 2px 5px rgba(0,0,0,0.35)',
    BOX_SHADOW_ALL: '0 2px 5px rgba(0,0,0,0.35)',
    BOX_SHADOW_SOME: '0 2px 5px rgba(0,0,0,0.3)',
    BOX_SHADOW_WANT: '0 2px 6px rgba(139,92,246,0.45)',
    BOX_SHADOW_NONE: '0 1px 3px rgba(0,0,0,0.18)',
    UNVISITED_BG: 'rgba(30, 41, 59, 0.45)',
    UNVISITED_OPACITY: 0.68,
    ICON_CHAR: PARK_MOUNTAIN_PEAK_SVG,
    ICON_CHAR_US: PARK_MOUNTAIN_PEAK_SVG,
    ICON_CHAR_CA: PARK_MOUNTAIN_GLACIER_SVG,
  },
  STATE: {
    DIAMETER: 22,
    ANCHOR: 11,
    FONT_SIZE: '12px',
    BORDER: '2px solid white',
    BORDER_ALL: '2px solid #16a34a',
    BORDER_SOME: '2px solid #d97706',
    BORDER_WANT: '2px solid white',
    BORDER_NONE: '2px solid #475569',
    BOX_SHADOW_ALL: '0 1.5px 3px rgba(0,0,0,0.35)',
    BOX_SHADOW_SOME: '0 1.5px 3px rgba(0,0,0,0.35)',
    BOX_SHADOW_WANT: '0 2px 6px rgba(139,92,246,0.45)',
    BOX_SHADOW_NONE: '0 1.5px 3px rgba(0,0,0,0.25)',
    ICON_CHAR: US_CAPITOL_DOME_SVG,
    ICON_CHAR_US: US_CAPITOL_DOME_SVG,
    ICON_CHAR_CA: CA_LEGISLATIVE_BLDG_SVG,
    ICON_COUNTRY_CAPITAL_US: '🇺🇸',
    ICON_COUNTRY_CAPITAL_CA: '🇨🇦',
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

/** Pixel radius within which markers cluster at current zoom. */
export const CLUSTER_COLLISION_RADIUS_PX = 28;

/** Maximum zoom level where clustering takes effect. At zoom > 11, all markers render individually. */
export const CLUSTER_MAX_ZOOM = 11;

/** Pixel padding applied around cluster bounding boxes when zooming in to separate (providing clearance from headers and overlay cards). */
export const CLUSTER_SEPARATE_PADDING_TOP_LEFT: [number, number] = [90, 80];
export const CLUSTER_SEPARATE_PADDING_BOTTOM_RIGHT: [number, number] = [140, 120];

/** Buffer ratio applied to cluster LatLngBounds to give generous breathing room beyond an exact fit. */
export const CLUSTER_BOUNDS_BUFFER_RATIO = 0.35;

/** Maximum zoom level used when clicking "Zoom In to Separate". */
export const CLUSTER_SEPARATE_MAX_ZOOM = 10;
