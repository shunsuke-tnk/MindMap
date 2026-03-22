"use client";

import { useCallback } from "react";
import { Position } from "@xyflow/react";
import { hierarchy } from "d3-hierarchy";
import { flextree } from "d3-flextree";
import type { MindMapNode, MindMapEdge, LayoutDirection } from "@/types/mindmap";

function estimateNodeSize(label: string, depth: number): [number, number] {
  const baseFontSize = depth === 0 ? 16 : depth === 1 ? 14 : 13;
  const charWidth = baseFontSize * 0.6;
  const padding = 32;
  const minWidth = 80;
  const maxWidth = 240;

  const textWidth = Math.min(label.length * charWidth + padding, maxWidth);
  const width = Math.max(textWidth, minWidth);
  const height = depth === 0 ? 44 : 36;

  return [width, height];
}

interface TreeNodeData {
  id: string;
  label: string;
  depth: number;
  color: string;
  collapsed: boolean;
  width: number;
  height: number;
  children: TreeNodeData[];
}

// 単一ツリーを構築
function buildTreeFromRoot(
  rootId: string,
  nodeMap: Map<string, MindMapNode>,
  childrenMap: Map<string, string[]>
): TreeNodeData | null {
  const node = nodeMap.get(rootId);
  if (!node) return null;

  const [width, height] = estimateNodeSize(node.data.label, node.data.depth);
  const childIds = childrenMap.get(rootId) ?? [];
  const children = node.data.collapsed
    ? []
    : childIds
        .map((cid) => buildTreeFromRoot(cid, nodeMap, childrenMap))
        .filter((c): c is TreeNodeData => c !== null);

  return {
    id: node.id,
    label: node.data.label,
    depth: node.data.depth,
    color: node.data.color,
    collapsed: node.data.collapsed,
    width,
    height,
    children,
  };
}

export function useMindMapLayout() {
  const calculateLayout = useCallback(
    (
      nodes: MindMapNode[],
      edges: MindMapEdge[],
      direction: LayoutDirection
    ): { nodes: MindMapNode[]; edges: MindMapEdge[] } => {
      if (nodes.length === 0) return { nodes, edges };

      const isHorizontal = direction === "horizontal";
      const nodeMap = new Map(nodes.map((n) => [n.id, n]));

      // ツリーエッジのみ使用（関連線はレイアウトに影響しない）
      const treeEdges = edges.filter((e) => e.type !== "relation");

      // 隣接リスト（親 → 子）
      const childrenMap = new Map<string, string[]>();
      const hasParent = new Set<string>();
      for (const edge of treeEdges) {
        const children = childrenMap.get(edge.source) ?? [];
        children.push(edge.target);
        childrenMap.set(edge.source, children);
        hasParent.add(edge.target);
      }

      // ルートノード群（ツリーエッジで親を持たないノード）
      const rootIds = nodes
        .filter((n) => !hasParent.has(n.id))
        .map((n) => n.id);

      const updatedNodes: MindMapNode[] = [];

      for (const rootId of rootIds) {
        const rootNode = nodeMap.get(rootId);
        if (!rootNode) continue;

        const tree = buildTreeFromRoot(rootId, nodeMap, childrenMap);
        if (!tree) continue;

        // 子ノードがなければ、元の位置（posX/posY）をそのまま使う
        if (tree.children.length === 0) {
          updatedNodes.push({
            ...rootNode,
            // position は storageToReactFlow で posX/posY から設定済み
            sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
            targetPosition: isHorizontal ? Position.Left : Position.Top,
          });
          continue;
        }

        // d3-flextree でレイアウト計算
        const layout = flextree<TreeNodeData>({
          nodeSize: (node) => {
            const d = node.data;
            if (isHorizontal) {
              // [垂直方向の間隔, 水平方向の間隔]
              return [d.height + 30, d.width + 100];
            }
            return [d.width + 50, d.height + 60];
          },
          spacing: 16,
        });

        const root = hierarchy(tree);
        const layoutRoot = layout(root);

        // ルートノードの基準位置（Storage の posX/posY）
        const baseX = rootNode.position.x;
        const baseY = rootNode.position.y;

        layoutRoot.each((layoutNode) => {
          const original = nodeMap.get(layoutNode.data.id);
          if (!original) return;

          let x: number;
          let y: number;

          if (isHorizontal) {
            x = layoutNode.y;
            y = layoutNode.x;
          } else {
            x = layoutNode.x;
            y = layoutNode.y;
          }

          // ルートノードの基準位置をオフセットとして加算
          updatedNodes.push({
            ...original,
            position: { x: x + baseX, y: y + baseY },
            sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
            targetPosition: isHorizontal ? Position.Left : Position.Top,
          });
        });
      }

      return { nodes: updatedNodes, edges };
    },
    []
  );

  return { calculateLayout };
}
