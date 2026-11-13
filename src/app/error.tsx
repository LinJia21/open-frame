"use client";

import { ErrorPanel } from "@/components/states/panels";

export default function Error({ retry }: { error: unknown; retry: () => void }) {
  return <ErrorPanel retry={retry} />;
}
