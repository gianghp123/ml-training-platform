import {
  createSseParser,
  parseRunEventMessage,
  type SseMessage,
} from "../sse-parser"

describe("SSE parser", () => {
  it("parses fragmented CRLF frames and ignores keepalive comments", () => {
    const messages: SseMessage[] = []
    const parser = createSseParser((message) => messages.push(message))

    parser.push(": keepalive\r\n\r\nid: 42\r\nevent: node.log\r\nda")
    parser.push(
      'ta: {"type":"node.log","runId":"run-1","timestamp":"2026-07-24T00:00:00.000Z","nodeId":"node-1","message":"training"}\r\n\r\n'
    )
    parser.finish()

    expect(messages).toEqual([
      {
        id: "42",
        event: "node.log",
        data: '{"type":"node.log","runId":"run-1","timestamp":"2026-07-24T00:00:00.000Z","nodeId":"node-1","message":"training"}',
      },
    ])
  })

  it("joins repeated data fields and dispatches a final unterminated frame", () => {
    const messages: SseMessage[] = []
    const parser = createSseParser((message) => messages.push(message))
    parser.push("event: node.log\ndata: first\ndata: second")
    parser.finish()
    expect(messages[0]?.data).toBe("first\nsecond")
  })
})

describe("run event parsing", () => {
  it("uses the transport event and attaches the replay id", () => {
    const event = parseRunEventMessage({
      id: "7-0",
      event: "run.started",
      data: JSON.stringify({
        runId: "run-1",
        timestamp: "2026-07-24T00:00:00.000Z",
      }),
    })

    expect(event).toMatchObject({
      type: "run.started",
      runId: "run-1",
      eventId: "7-0",
    })
  })

  it("rejects invalid JSON and unknown event types", () => {
    expect(
      parseRunEventMessage({ event: "run.started", data: "not-json" })
    ).toBeNull()
    expect(
      parseRunEventMessage({
        data: JSON.stringify({
          type: "run.unknown",
          runId: "run-1",
        }),
      })
    ).toBeNull()
  })
})
