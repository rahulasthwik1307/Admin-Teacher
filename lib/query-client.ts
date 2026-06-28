import { QueryClient } from "@tanstack/react-query"

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,         // data stays fresh 60 seconds
        gcTime: 5 * 60 * 1000,        // keep unused data in memory 5 minutes
        refetchOnWindowFocus: false,   // don't refetch when tab regains focus
        refetchOnMount: false,         // don't refetch if data is still fresh
        retry: 1,
      },
    },
  })
}