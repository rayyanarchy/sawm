/** The file a recorded response is stored in, derived from its request URL. */
export function fixtureName(url: string): string {
  const { hostname, pathname, searchParams } = new URL(url)
  const query = [...searchParams]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')
  return `${hostname}${pathname}${query ? `?${query}` : ''}`.replace(/[^\w.=&-]+/g, '_') + '.json'
}
