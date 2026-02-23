import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "v0 Agent Builder - Powered by AI Gateway & AI SDK"
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = "image/png"

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#000000",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Main title */}
      <div
        style={{
          fontSize: 72,
          fontWeight: 500,
          color: "#ffffff",
          marginBottom: 32,
          textAlign: "center",
          fontFamily: "monospace",
          letterSpacing: "-0.02em",
        }}
      >
        v0 Agent Builder
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontSize: 24,
          color: "#71717a",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          fontWeight: 400,
        }}
      >
        Powered by AI Gateway & AI SDK
      </div>
    </div>,
    {
      ...size,
    },
  )
}
