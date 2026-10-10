import { describe, expect, it } from 'vitest'
import { createFakeDevice } from '../core/testing/fakeDevice'
import { demoDevice } from './demo'

describe('Demo device', () => {
  it('moves the clock without moving the real one', () => {
    const fake = createFakeDevice({ now: '2026-10-04T06:00:00Z' })
    const { device, clock } = demoDevice(fake.device)

    clock.setOffset(3_600_000)

    expect(device.clock.now()).toBe(Date.parse('2026-10-04T07:00:00Z'))
    expect(fake.device.clock.now()).toBe(Date.parse('2026-10-04T06:00:00Z'))
  })

  it('reads what is saved but keeps its own writes to itself', async () => {
    const fake = createFakeDevice({ now: '2026-10-04T06:00:00Z' })
    await fake.device.storage.set('settings', { theme: 'dark' })
    const { device } = demoDevice(fake.device)

    await device.storage.set('settings', { theme: 'light' })

    expect(await device.storage.get('settings')).toEqual({ theme: 'light' })
    expect(await fake.device.storage.get('settings')).toEqual({ theme: 'dark' })
  })

  it('never reaches Sawm’s own server', async () => {
    const fake = createFakeDevice({ now: '2026-10-04T06:00:00Z' })
    const { device } = demoDevice(fake.device)

    await device.fetch('/api/reminders', { method: 'PUT', body: '{}' })

    expect(fake.server).toEqual([])
  })
})
