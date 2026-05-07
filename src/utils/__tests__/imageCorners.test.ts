import { describe, it, expect } from 'vitest'
import { imageOverlayCorners } from '../imageCorners'
import { metersToLngLat, lngLatToMeters } from '../projection'
import type { BBox3857 } from '../../types'

// Real-world test bbox near Moscow (EPSG:3857)
const MOSCOW_BBOX: BBox3857 = {
  minX: 4_130_000,
  minY: 7_480_000,
  maxX: 4_160_000,
  maxY: 7_510_000,
}

describe('imageOverlayCorners', () => {
  it('returns exactly 4 corners', () => {
    const corners = imageOverlayCorners(MOSCOW_BBOX)
    expect(corners).toHaveLength(4)
  })

  it('NW corner is [min_lng, max_lat]', () => {
    const [swLng, _swLat] = metersToLngLat(MOSCOW_BBOX.minX, MOSCOW_BBOX.minY)
    const [_neLng, neLat] = metersToLngLat(MOSCOW_BBOX.maxX, MOSCOW_BBOX.maxY)
    const corners = imageOverlayCorners(MOSCOW_BBOX)
    expect(corners[0][0]).toBeCloseTo(swLng, 8)  // NW.lng = min_lng
    expect(corners[0][1]).toBeCloseTo(neLat, 8)  // NW.lat = max_lat
  })

  it('NE corner is [max_lng, max_lat]', () => {
    const [_neLng, neLat] = metersToLngLat(MOSCOW_BBOX.maxX, MOSCOW_BBOX.maxY)
    const corners = imageOverlayCorners(MOSCOW_BBOX)
    const [neLng2] = metersToLngLat(MOSCOW_BBOX.maxX, MOSCOW_BBOX.maxY)
    expect(corners[1][0]).toBeCloseTo(neLng2, 8)  // NE.lng = max_lng
    expect(corners[1][1]).toBeCloseTo(neLat, 8)   // NE.lat = max_lat
  })

  it('SE corner is [max_lng, min_lat]', () => {
    const [_swLng, swLat] = metersToLngLat(MOSCOW_BBOX.minX, MOSCOW_BBOX.minY)
    const [neLng] = metersToLngLat(MOSCOW_BBOX.maxX, MOSCOW_BBOX.maxY)
    const corners = imageOverlayCorners(MOSCOW_BBOX)
    expect(corners[2][0]).toBeCloseTo(neLng, 8)  // SE.lng = max_lng
    expect(corners[2][1]).toBeCloseTo(swLat, 8)  // SE.lat = min_lat
  })

  it('SW corner is [min_lng, min_lat]', () => {
    const [swLng, swLat] = metersToLngLat(MOSCOW_BBOX.minX, MOSCOW_BBOX.minY)
    const corners = imageOverlayCorners(MOSCOW_BBOX)
    expect(corners[3][0]).toBeCloseTo(swLng, 8)  // SW.lng = min_lng
    expect(corners[3][1]).toBeCloseTo(swLat, 8)  // SW.lat = min_lat
  })

  it('western corners have smaller lng than eastern', () => {
    const corners = imageOverlayCorners(MOSCOW_BBOX)
    expect(corners[0][0]).toBeLessThan(corners[1][0])  // NW.lng < NE.lng
    expect(corners[3][0]).toBeLessThan(corners[2][0])  // SW.lng < SE.lng
  })

  it('northern corners have larger lat than southern', () => {
    const corners = imageOverlayCorners(MOSCOW_BBOX)
    expect(corners[0][1]).toBeGreaterThan(corners[3][1])  // NW.lat > SW.lat
    expect(corners[1][1]).toBeGreaterThan(corners[2][1])  // NE.lat > SE.lat
  })

  it('round-trips: corners[3] back to EPSG:3857 matches bbox.minX/minY', () => {
    const corners = imageOverlayCorners(MOSCOW_BBOX)
    const [x, y] = lngLatToMeters(corners[3][0], corners[3][1])  // SW corner
    expect(x).toBeCloseTo(MOSCOW_BBOX.minX, 0)
    expect(y).toBeCloseTo(MOSCOW_BBOX.minY, 0)
  })

  it('round-trips: corners[1] back to EPSG:3857 matches bbox.maxX/maxY', () => {
    const corners = imageOverlayCorners(MOSCOW_BBOX)
    const [x, y] = lngLatToMeters(corners[1][0], corners[1][1])  // NE corner
    expect(x).toBeCloseTo(MOSCOW_BBOX.maxX, 0)
    expect(y).toBeCloseTo(MOSCOW_BBOX.maxY, 0)
  })
})
