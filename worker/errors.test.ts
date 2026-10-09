import { describe, expect, it } from 'vitest'
import { handleErrorReport } from './errors'

const post = (body: unknown, log: (line: string) => void) =>
  handleErrorReport(new Request('https://sawm.example/api/errors', { method: 'POST', body: JSON.stringify(body) }), log)

describe('Error reports', () => {
  it('writes a report to the logs, keeping only the fields it knows', async () => {
    const lines: string[] = []

    const response = await post({ message: 'Boom', stack: 'at x', version: 'abc1234', screen: 'today', location: { latitude: 1 } }, (l) => lines.push(l))

    expect(response.status).toBe(204)
    expect(lines.map((l) => JSON.parse(l))).toEqual([{ kind: 'client-error', message: 'Boom', stack: 'at x', version: 'abc1234', screen: 'today' }])
  })

  it('refuses anything malformed or oversized', async () => {
    const lines: string[] = []
    expect((await post({ message: 'x'.repeat(501), version: 'v', screen: 's' }, (l) => lines.push(l))).status).toBe(400)
    expect((await post({ message: 'ok' }, (l) => lines.push(l))).status).toBe(400)
    expect(lines).toEqual([])
  })
})
