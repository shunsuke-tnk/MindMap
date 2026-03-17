"use client";

import { useCallback } from "react";
import { Position } from "@xyflow/react";
import { hierarchy } from "d3-hierarchy";
import { flextree } from "d3-flextree";
import type { MindMapNode, MindMapEdge, LayoutDirection } from "@/types/mindmap";

// ノードのサイズ推定（テキスト長に応じて幅を調整）
function estimateNodeSize(label: string, depth: number): [number, number] {
  const baseFontSize = depth === 0 ? 16 : depth === 1 ? 14 : 13;
  const charWidth = baseFontSize * 0.6;
  const padding = 32; // px-4 の左右
  const minWidth = 80;
  const maxWidth = 240;

  const textWidth = Math.min(label.length * charWidth + padding, maxWidth);
  const width = Math.max(textWidth, minWidth);
  const height = depth === 0 ? 44 : 36;

  return [width, height];
}

// ノード・エッジからツリー構造を構築
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

function buildTree(
  nodes: MindMapNode[],
  edges: MindMapEdge[]
): TreeNodeData | null {
  if (nodes.length === 0) return null;

  // ルートノードを見つける（depth === 0 または入力エッジがないノード）
  const targetIds = new Set(edges.map((e) => e.target));
  const rootNode = nodes.find(
    (n) => n.data.depth === 0 || !targetIds.has(n.id)
  );
  if (!rootNode) return null;

  // 隣接リスト（親 → 子の配列）
  const childrenMap = new Map<string, string[]>();
  for (const edge of edges) {
    const children = childrenMap.get(edge.source) ?? [];
    children.push(edge.target);
    childrenMap.set(edge.source, children);
  }

  // ノードIDでルックアップ
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // 再帰的にツリー構造を構築
  function buildSubtree(nodeId: string): TreeNodeData | null {
    const node = nodeMap.get(nodeId);
    if (!node) return null;

    const [width, height] = estimateNodeSize(
      node.data.label,
      node.data.depth
    );

    const childIds = childrenMap.get(nodeId) ?? [];
    const children = node.data.collapsed
      ? []
      : childIds
          .map(buildSubtree)
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

  return buildSubtree(rootNode.id);
}

export function useMindMapLayout() {
  const calculateLayout = useCallback(
    (
      nodes: MindMapNode[],
      edges: MindMapEdge[],
      direction: LayoutDirection
    ): { nodes: MindMapNode[]; edges: MindMapEdge[] } => {
      const tree = buildTree(nodes, edges);
      if (!tree) return { nodes, edges };

      const isHorizontal = direction === "horizontal";

      // d3-flextree でレイアウト計算
      const layout = flextree<TreeNodeData>({
        nodeSize: (node) => {
          const d = node.data;
          // flextree は [width, height] を返す（ツリー方向に対する直交軸, 平行軸）
          if (isHorizontal) {
            return [d.height + 20, d.width + 60]; // 縦方向にノード高さ+間隔、横方向にノード幅+間隔
          }
          return [d.width + 40, d.height + 50]; // 横方向にノード幅+間隔、縦方向にノード高さ+間隔
        },
        spacing: 10,
      });

      const root = hierarchy(tree);
      const layoutRoot = layout(root);

      // レイアウト結果をReact Flowのノードに反映
      const nodeMap = new Map(nodes.map((n) => [n.id, n]));
      const updatedNodes: MindMapNode[] = [];

      layoutRoot.each((layoutNode) => {
        const original = nodeMap.get(layoutNode.data.id);
        if (!original) return;

        // d3-flextree の座標をReact Flowの座標に変換
        let x: number;
        let y: number;

        if (isHorizontal) {
          // horizontal: ツリーは左→右に展開
          x = layoutNode.y; // flextree の y がReact Flowの x（展開方向）
          y = layoutNode.x; // flextree の x がReact Flowの y（直交方向）
        } else {
          // vertical: ツリーは上→下に展開
          x = layoutNode.x;
          y = layoutNode.y;
        }

        updatedNodes.push({
          ...original,
          position: { x, y },
          sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
          targetPosition: isHorizontal ? Position.Left : Position.Top,
        });
      });

      return { nodes: updatedNodes, edges };
    },
    []
  );

  return { calculateLayout };
}
