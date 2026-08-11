export const ROUTES = {
  HOME: "/",
  AUTH: {
    SIGN_IN: "/sign-in",
    SIGN_UP: "/sign-up",
  },
  WORKFLOW: {
    LIST: "/dashboard",
    CREATE: "/builder",
    DETAIL: (workflowId: string) => `/builder?workflowId=${encodeURIComponent(workflowId)}`,
  },
  DATASET: {
    LIST: "/datasets",
  },
} as const
