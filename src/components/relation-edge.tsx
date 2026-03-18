"use client";

import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react";

export function RelationEdgeComponent({
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
    curvature: 0.5,
  });

  const color = (data?.color as string) ?? "#94A3B8";

  return (
    <BaseEdge
      path={edgePath}
      markerEnd={markerEnd}
      style={{
        ...style,
        stroke: color,
        strokeWidth: 1.5,
        strokeDasharray: "6 3",
        strokeOpacity: 0.7,
      }}
    />
  );
}
