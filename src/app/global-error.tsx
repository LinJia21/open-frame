"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: "4rem auto", maxWidth: "36rem", fontFamily: "Georgia, serif", color: "#1c1915" }}>
        <h1 style={{ fontWeight: 500 }}>The page could not be shown</h1>
        <p style={{ fontFamily: "Segoe UI, sans-serif", fontSize: "0.95rem" }}>
          Something went wrong while rendering this page.
        </p>
        <p>
          <button type="button" onClick={() => reset()}>
            Try again
          </button>
        </p>
        <p>
          {/* The root layout is gone here, so this is a full navigation. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/">Back to home</a>
        </p>
      </body>
    </html>
  );
}
