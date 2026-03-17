import type { Node, Edge } from "@xyflow/react";

// マインドマップノードのデータ
export interface MindMapNodeData {
  label: string;
  color: string;
  depth: number;
  collapsed: boolean;
  [key: string]: unknown;
}

// React Flow のノード型
export type MindMapNode = Node<MindMapNodeData, "mindmap">;

// React Flow のエッジ型
export type MindMapEdge = Edge;

// レイアウト方向
export type LayoutDirection = "horizontal" | "vertical";
