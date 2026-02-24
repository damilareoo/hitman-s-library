import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "scape Hitman's Library - Design Extraction & Reference"
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
        backgroundColor: "#0a0a0a",
        fontFamily: "system-ui, sans-serif",
        backgroundImage:
          "radial-gradient(circle at 2px 2px, #1a1a1a 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }}
    >
      {/* Subtitle */}
      <div
        style={{
          fontSize: 32,
          color: "#ffffff",
          marginBottom: 16,
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          fontWeight: 400,
          letterSpacing: "0.05em",
        }}
      >
        scape
      </div>

      {/* Main title */}
      <div
        style={{
          fontSize: 96,
          fontWeight: 700,
          color: "#ffffff",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
          maxWidth: "90%",
        }}
      >
        HITMAN'S LIBRARY
      </div>
    </div>,
    {
      ...size,
    },
  )
}
