"use server"

import { auth } from "@clerk/nextjs/server"
import {
  ApiResponse,
  PaginatedMeta
} from "@training-ml/contracts"
import "server-only"

type ApiFetchOptions = {
  baseUrl?: string
  withCredentials?: boolean
  query?: Record<string, unknown>
  body?: unknown
} & Omit<RequestInit, "body">

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isBodyInit(value: unknown): value is BodyInit {
  return (
    typeof value === "string" ||
    value instanceof FormData ||
    value instanceof Blob ||
    value instanceof ArrayBuffer ||
    value instanceof URLSearchParams ||
    value instanceof ReadableStream
  )
}

function getErrorMessage(error: unknown): string {
  if (!isRecord(error)) return "Unknown error"

  if (typeof error.message === "string") return error.message

  if (typeof error.error === "string") return error.error

  if (
    isRecord(error.error) &&
    typeof error.error.message === "string"
  ) {
    return error.error.message
  }

  return "Unknown error"
}

function buildQueryString(query?: Record<string, unknown>): string {
  if (!query) return ""

  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(query)) {
    if (value == null || value === "") continue

    searchParams.append(
      key,
      typeof value === "object" ? JSON.stringify(value) : String(value),
    )
  }

  return searchParams.toString()
}

async function createHeaders(
  headersInit: HeadersInit | undefined,
  withCredentials: boolean,
): Promise<Headers> {
  const headers = new Headers(headersInit)

  headers.set("apikey", process.env.API_KEY ?? "")

  if (!withCredentials) {
    return headers
  }

  const { getToken } = await auth()
  const token = await getToken()

  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  return headers
}

function createBody(
  body: unknown,
  headers: Headers,
): BodyInit | null | undefined {
  if (body === undefined) return undefined
  if (body === null) return null

  if (isBodyInit(body)) {
    return body
  }

  headers.set("Content-Type", "application/json")
  return JSON.stringify(body)
}

async function parseJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type")

  if (!contentType?.includes("application/json")) {
    return undefined
  }

  const text = await response.text()

  return text ? JSON.parse(text) : undefined
}

function normalizeResponse<T>(
  raw: unknown,
): ApiResponse<T> {
  if (!isRecord(raw)) {
    return {
      data: raw as T,
    }
  }

  if ("meta" in raw) {
    return {
      data: raw.data as T,
      meta: raw.meta as PaginatedMeta,
    }
  }

  return {
    data: (raw.data ?? raw) as T,
  }
}

export async function apiFetch<T>(
  url: string,
  options: ApiFetchOptions = {},
): Promise<ApiResponse<T>> {
  const {
    baseUrl = process.env.API_URL,
    withCredentials = false,
    query,
    body,
    ...fetchOptions
  } = options

  if (!baseUrl) {
    throw new Error("API_URL environment variable is missing.")
  }

  const queryString = buildQueryString(query)

  const headers = await createHeaders(
    fetchOptions.headers,
    withCredentials,
  )

  const response = await fetch(
    `${baseUrl}${url}${queryString ? `?${queryString}` : ""}`,
    {
      ...fetchOptions,
      method: fetchOptions.method ?? "GET",
      headers,
      body: createBody(body, headers),
    },
  )

  if (!response.ok) {
    const errorBody = await parseJson(response)

    throw new Error(getErrorMessage(errorBody))
  }

  const raw = await parseJson(response)

  return normalizeResponse<T>(raw)
}
