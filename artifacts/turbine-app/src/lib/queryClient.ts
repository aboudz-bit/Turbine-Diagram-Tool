import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error: unknown) => {
        const status = (error as { response?: { status?: number } })?.response
          ?.status;
        if (status === 401 || status === 403) return false;
        return failureCount < 1;
      },
    },
    mutations: {
      onError: (error: unknown) => {
        const status = (error as { response?: { status?: number } })?.response
          ?.status;
        if (status === 401) {
          console.warn("[auth] 401 from mutation — clearing session");
          _logoutRef?.();
        }
      },
    },
  },
});

let _logoutRef: (() => void) | null = null;

export function registerLogout(fn: () => void) {
  _logoutRef = fn;
}

export function clearQueryCache() {
  queryClient.clear();
}

queryClient.getQueryCache().subscribe((event) => {
  if (event.type === "updated" && event.action.type === "error") {
    const status = (
      event.action.error as { response?: { status?: number } }
    )?.response?.status;
    if (status === 401) {
      console.warn("[auth] 401 from query — clearing session");
      _logoutRef?.();
    }
  }
});
