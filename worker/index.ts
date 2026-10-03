export default {
  async fetch(request) {
    const { pathname } = new URL(request.url)
    if (pathname === '/api/health') {
      return Response.json({ ok: true })
    }
    return new Response('Not found', { status: 404 })
  },
} satisfies ExportedHandler<Env>
