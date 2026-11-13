"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="zh">
      <body style={{ margin: 0, minHeight: "100vh", background: "#f4efe6", color: "#1c1915", fontFamily: "Georgia, 'Songti SC', serif" }}>
        <main style={{ maxWidth: "36rem", margin: "0 auto", padding: "4rem 1.25rem" }}>
          <h1 style={{ fontWeight: 500, fontSize: "2rem", letterSpacing: "-0.02em" }}>这一页没能显示</h1>
          <p style={{ fontFamily: "-apple-system, 'PingFang SC', 'Segoe UI', sans-serif", fontSize: "1rem", lineHeight: 1.7, color: "#3a342c" }}>
            渲染时出了问题。可以再试一次，或回到首页。
          </p>
          <p style={{ fontFamily: "-apple-system, 'PingFang SC', 'Segoe UI', sans-serif", fontSize: "1rem", lineHeight: 1.7, color: "#3a342c" }}>
            渲染時出了問題。可以再試一次，或回到首頁。
          </p>
          <p style={{ fontFamily: "-apple-system, 'PingFang SC', 'Segoe UI', sans-serif", fontSize: "1rem", lineHeight: 1.7, color: "#3a342c" }}>
            Something went wrong while rendering this page.
          </p>
          <p>
            <button
              type="button"
              onClick={() => reset()}
              style={{ minHeight: 44, padding: "0 1.1rem", borderRadius: 999, border: "1px solid #e4d48a", background: "#f3e6a4", color: "#1c1915", fontSize: 15 }}
            >
              再试一次 · 再試一次 · Try again
            </button>
          </p>
          <p>
            {/* The root layout is gone here, so this is a full navigation. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ display: "inline-flex", minHeight: 44, alignItems: "center", color: "#1c1915" }}>
              返回首页 · 返回首頁 · Back to home
            </a>
          </p>
        </main>
      </body>
    </html>
  );
}
