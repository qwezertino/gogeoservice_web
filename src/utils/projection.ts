import proj4 from 'proj4'

proj4.defs('EPSG:3857', '+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs +type=crs')
proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs +type=crs')

/** [lng, lat] → [x, y] в метрах (EPSG:3857) */
export function lngLatToMeters(lng: number, lat: number): [number, number] {
  return proj4('EPSG:4326', 'EPSG:3857', [lng, lat]) as [number, number]
}

/** [x, y] в метрах → [lng, lat] (EPSG:4326) */
export function metersToLngLat(x: number, y: number): [number, number] {
  return proj4('EPSG:3857', 'EPSG:4326', [x, y]) as [number, number]
}
