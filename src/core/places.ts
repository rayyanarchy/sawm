import type { Device } from './device'

/** A place someone can choose as their Saved Location. */
export interface Place {
  name: string
  region?: string
  country: string
  countryCode: string
  /** Rounded to 2 decimal places (about 1 km), so an exact position never leaves the device. */
  latitude: number
  longitude: number
}

interface PhotonResponse {
  features: {
    geometry: { coordinates: [longitude: number, latitude: number] }
    properties: {
      name?: string
      city?: string
      district?: string
      county?: string
      state?: string
      country?: string
      countrycode?: string
    }
  }[]
}

export function roundCoordinate(value: number): number {
  return Math.round(value * 100) / 100
}

/** Finds cities, towns and villages matching what the user typed, using Photon (OpenStreetMap data). */
export async function searchPlaces(fetch: Device['fetch'], query: string): Promise<Place[]> {
  const params = new URLSearchParams({ q: query, lang: 'en', limit: '5', layer: 'city' })
  const response = await fetch(`https://photon.komoot.io/api/?${params}`)
  if (!response.ok) throw new Error(`Place search failed with status ${response.status}`)
  const { features } = (await response.json()) as PhotonResponse

  return features.flatMap(({ geometry, properties }) => {
    const { name, state, country, countrycode } = properties
    if (!name || !country || !countrycode) return []
    const [longitude, latitude] = geometry.coordinates
    return [
      {
        name,
        ...(state ? { region: state } : {}),
        country,
        countryCode: countrycode,
        latitude: roundCoordinate(latitude),
        longitude: roundCoordinate(longitude),
      },
    ]
  })
}

/** Names the town a position is in, using Photon. The position is rounded before it's sent. */
export async function placeAt(fetch: Device['fetch'], latitude: number, longitude: number): Promise<Place | undefined> {
  const lat = roundCoordinate(latitude)
  const lon = roundCoordinate(longitude)
  const response = await fetch(`https://photon.komoot.io/reverse?${new URLSearchParams({ lat: String(lat), lon: String(lon), lang: 'en' })}`)
  if (!response.ok) throw new Error(`Place lookup failed with status ${response.status}`)
  const { features } = (await response.json()) as PhotonResponse
  const properties = features[0]?.properties
  const name = properties && (properties.city ?? properties.district ?? properties.county ?? properties.name)
  if (!properties || !name || !properties.country || !properties.countrycode) return undefined
  return {
    name,
    ...(properties.state ? { region: properties.state } : {}),
    country: properties.country,
    countryCode: properties.countrycode,
    latitude: lat,
    longitude: lon,
  }
}
