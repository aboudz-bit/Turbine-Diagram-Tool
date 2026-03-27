import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error: unknown) => {
        // Use ApiError.status (not .response.status — that's the raw Response object)
        const status =
          (error as { status?: number })?.status ??
          (error as { response?: { status?: number } })?.response?.status;
        if (status === 401 || status === 403) return false;
        return failureCount < 1;
      },
    },
    mutations: {
      onError: (error: unknown) => {
        const status =
          (error as { status?: number })?.status ??
          (error as { response?: { status?: number } })?.response?.status;
        if (status === 401 && _isLoggedIn) {
          console.warn("[auth] 401 from mutation — clearing session");
          _logoutRef?.();
        }
      },
    },
  },
});

let _logoutRef: (() => void) | null = null;
let _isLoggedIn = false;

export function registerLogout(fn: () => void) {
  _logoutRef = fn;
}

export function setLoggedIn(value: boolean) {
  _isLoggedIn = value;
}

export function clearQueryCache() {
  queryClient.clear();
}

queryClient.getQueryCache().subscribe((event) => {
  if (event.type === "updated" && event.action.type === "error") {
    const status =
      (event.action.error as { status?: number })?.status ??
      (event.action.error as { response?: { status?: number } })?.response
        ?.status;
    if (status === 401 && _isLoggedIn) {
      console.warn("[auth] 401 from query — clearing session");
      _logoutRef?.();
    }
  }
});
