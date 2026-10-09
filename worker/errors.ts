/** One crash report from the app. It never carries location, settings or a push subscription. */
export interface ErrorReport {
  message: string
  stack?: string
  version: string
  screen: string
}

const fits = (value: unknown, max: number) => typeof value === 'string' && value.length <= max

/** Accepts a crash report and writes it to the Worker logs. Nothing is stored. */
export async function handleErrorReport(request: Request, log: (line: string) => void = console.error): Promise<Response> {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const report = (await request.json().catch(() => undefined)) as Partial<ErrorReport> | undefined
  if (!report || !fits(report.message, 500) || (report.stack !== undefined && !fits(report.stack, 4000)) || !fits(report.version, 40) || !fits(report.screen, 40)) {
    return new Response('Invalid report', { status: 400 })
  }
  const { message, stack, version, screen } = report as ErrorReport
  log(JSON.stringify({ kind: 'client-error', message, stack, version, screen }))
  return new Response(null, { status: 204 })
}
