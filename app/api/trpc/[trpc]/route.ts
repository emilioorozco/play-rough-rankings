import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter, createTRPCContext } from '@/lib/trpc/server'

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ headers: req.headers, req }),
  })

export { handler as GET, handler as POST }