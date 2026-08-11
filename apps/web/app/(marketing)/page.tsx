import type { Metadata } from "next"

import { LandingPage } from "@/features/landing"

export const metadata: Metadata = {
  title: "ML Studio — Visual machine-learning pipelines",
  description:
    "Design, validate and operate end-to-end machine-learning pipelines on one connected visual canvas.",
  keywords: [
    "machine learning pipeline",
    "MLOps",
    "visual workflow builder",
    "model training",
  ],
  openGraph: {
    title: "ML Studio — From raw data to a production-ready model",
    description:
      "Build, validate and observe machine-learning pipelines in one visual workspace.",
    type: "website",
  },
}

export default function Page() {
  return <LandingPage />
}
