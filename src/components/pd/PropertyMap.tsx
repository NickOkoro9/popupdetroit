import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import type { Property } from "@/lib/matching/types";

const Inner = lazy(() => import("./PropertyMap.client"));

export function PropertyMap(props: { properties: Property[]; selectedId: string | null; onSelect?: (id: string) => void; className?: string }) {
  const fallback = <div className={`${props.className ?? ""} animate-pulse bg-muted`} />;
  return (
    <ClientOnly fallback={fallback}>
      <Suspense fallback={fallback}>
        <Inner {...props} />
      </Suspense>
    </ClientOnly>
  );
}
