/**
 * @jest-environment node
 */

import { GET } from "./route"

describe("artifact download BFF", () => {
  const originalApiUrl = process.env.API_URL

  beforeEach(() => {
    process.env.API_URL = "http://api.test/v1"
    jest.restoreAllMocks()
  })

  afterAll(() => {
    if (originalApiUrl === undefined) {
      delete process.env.API_URL
    } else {
      process.env.API_URL = originalApiUrl
    }
  })

  it("redirects the browser to the presigned artifact URL", async () => {
    const downloadUrl =
      "http://localhost:9009/uploads/model.joblib?signature=ok"
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(Response.json({ url: downloadUrl }))

    const response = await GET(
      new Request("http://localhost:3000/api/artifacts/artifact-1/download"),
      { params: Promise.resolve({ artifactId: "artifact-1" }) }
    )

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/v1/artifacts/artifact-1/download",
      expect.objectContaining({ cache: "no-store" })
    )
    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe(downloadUrl)
  })

  it("rejects an invalid URL returned by the artifact service", async () => {
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(Response.json({ url: "javascript:alert(1)" }))

    const response = await GET(
      new Request("http://localhost:3000/api/artifacts/artifact-1/download"),
      { params: Promise.resolve({ artifactId: "artifact-1" }) }
    )

    expect(response.status).toBe(502)
  })
})
