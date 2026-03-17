"use client";

import { useReactFlow, useViewport } from "@xyflow/react";
import { useStorage, useMutation, type StorageGroupData } from "@/lib/liveblocks";
import { LiveObject } from "@liveblocks/client";

const GROUP_BG_COLORS = [
  "rgba(99, 102, 241, 0.08)",
  "rgba(236, 72, 153, 0.08)",
  "rgba(245, 158, 11, 0.08)",
  "rgba(16, 185, 129, 0.08)",
  "rgba(139, 92, 246, 0.08)",
];

const GROUP_BORDER_COLORS = [
  "rgba(99, 102, 241, 0.35)",
  "rgba(236, 72, 153, 0.35)",
  "rgba(245, 158, 11, 0.35)",
  "rgba(16, 185, 129, 0.35)",
  "rgba(139, 92, 246, 0.35)",
];

interface GroupOverlayProps {
  selectedNodeIds: string[];
}

export function GroupOverlay({ selectedNodeIds }: GroupOverlayProps) {
  const groups = useStorage((root) => root.groups);
  const { getNodes } = useReactFlow();
  const { x: vx, y: vy, zoom } = useViewport();

  if (!groups) return null;

  const allNodes = getNodes();
  const nodePositions = new Map(
    allNodes.map((n) => [
      n.id,
      {
        x: n.position.x,
        y: n.position.y,
        width: n.measured?.width ?? 120,
        height: n.measured?.height ?? 40,
      },
    ])
  );

  const groupEntries: { id: string; data: StorageGroupData }[] = [];
  groups.forEach((data: StorageGroupData, key: string) => {
    groupEntries.push({ id: key, data });
  });

  if (groupEntries.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ overflow: "visible", zIndex: 0 }}
    >
      <g transform={`translate(${vx}, ${vy}) scale(${zoom})`}>
        {groupEntries.map(({ id, data }, index) => {
          const memberNodes = data.nodeIds
            .map((nid) => nodePositions.get(nid))
            .filter(
              (
                p
              ): p is {
                x: number;
                y: number;
                width: number;
                height: number;
              } => p !== undefined
            );

          if (memberNodes.length === 0) return null;

          const padding = 24;
          const labelHeight = 22;
          const minX = Math.min(...memberNodes.map((n) => n.x)) - padding;
          const minY =
            Math.min(...memberNodes.map((n) => n.y)) - padding - labelHeight;
          const maxX =
            Math.max(...memberNodes.map((n) => n.x + n.width)) + padding;
          const maxY =
            Math.max(...memberNodes.map((n) => n.y + n.height)) + padding;

          const bgColor = GROUP_BG_COLORS[index % GROUP_BG_COLORS.length];
          const borderColor =
            GROUP_BORDER_COLORS[index % GROUP_BORDER_COLORS.length];

          return (
            <g key={id}>
              <rect
                x={minX}
                y={minY}
                width={maxX - minX}
                height={maxY - minY}
                rx={16}
                fill={bgColor}
                stroke={borderColor}
                strokeWidth={1.5}
              />
              {data.label && (
                <text
                  x={minX + 12}
                  y={minY + 15}
                  fontSize={12}
                  fill={borderColor.replace("0.35", "0.8")}
                  fontWeight={600}
                >
                  {data.label}
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

export function useGroupActions() {
  const createGroup = useMutation(
    ({ storage }, nodeIds: string[], label: string) => {
      const groupsMap = storage.get("groups");
      const groupId = `group-${Date.now()}`;
      const index = groupsMap.size;
      groupsMap.set(
        groupId,
        new LiveObject<StorageGroupData>({
          id: groupId,
          label,
          color: GROUP_BG_COLORS[index % GROUP_BG_COLORS.length],
          nodeIds,
        })
      );
    },
    []
  );

  const deleteGroup = useMutation(
    ({ storage }, groupId: string) => {
      const groupsMap = storage.get("groups");
      groupsMap.delete(groupId);
    },
    []
  );

  return { createGroup, deleteGroup };
}
