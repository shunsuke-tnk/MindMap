"use client";

import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react";

export function RelationEdgeComponent({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  data,
  selected,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    curvature: 0.5,
  });

  const color = (data?.color as string) ?? "#94A3B8";

  return (
    <>
      {/* クリック領域拡張用の透明な太い線 */}
      <path d={edgePath} fill="none" stroke="transparent" strokeWidth={20} />
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: selected ? "#3B82F6" : color,
          strokeWidth: selected ? 2.5 : 1.5,
          strokeDasharray: "6 3",
          strokeOpacity: selected ? 1 : 0.7,
        }}
      />
    </>
  );
}
