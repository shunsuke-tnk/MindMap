"use client";

import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react";

export function MindMapEdgeComponent({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    curvature: 0.4,
  });

  const color = (data?.color as string) ?? "#94A3B8"; // slate-400 がデフォルト

  return (
    <BaseEdge
      path={edgePath}
      markerEnd={markerEnd}
      style={{
        ...style,
        stroke: color,
        strokeWidth: 2,
        strokeOpacity: 0.6,
      }}
    />
  );
}
