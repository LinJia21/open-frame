"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ExportBar({
  markdown,
  json,
  filename,
  labels,
}: {
  markdown: string;
  json: string;
  filename: string;
  labels: { md: string; json: string; print: string; done: string };
}) {
  const [notice, setNotice] = useState<string | null>(null);

  function download(contents: string, name: string, type: string) {
    const blob = new Blob([contents], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
    setNotice(labels.done);
  }

  return (
    <div className="no-print flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <Button type="button" variant="outline" onClick={() => download(markdown, `${filename}.md`, "text/markdown")}>
        {labels.md}
      </Button>
      <Button type="button" variant="outline" onClick={() => download(json, `${filename}.json`, "application/json")}>
        {labels.json}
      </Button>
      <Button type="button" variant="outline" onClick={() => window.print()}>
        {labels.print}
      </Button>
      <span className="sr-only" aria-live="polite">{notice}</span>
    </div>
  );
}
