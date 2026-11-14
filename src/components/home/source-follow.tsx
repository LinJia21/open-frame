"use client";

import { useSourceIds } from "@/lib/sources/use-source-ids";

export function SourceFollowButton({
  sourceId,
  follow,
  following,
}: {
  sourceId: string;
  follow: string;
  following: string;
}) {
  const { ids, setIds } = useSourceIds();
  const active = ids.includes(sourceId);
  return (
    <button
      type="button"
      className="paper-action w-full"
      aria-pressed={active}
      onClick={() => setIds(active ? ids.filter((id) => id !== sourceId) : [...ids, sourceId])}
    >
      {active ? following : follow}
    </button>
  );
}
