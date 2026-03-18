"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type EdgeTypes,
  type OnConnect,
  ConnectionMode,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type {
  MindMapNode,
  MindMapEdge,
  LayoutDirection,
} from "@/types/mindmap";
import { MindMapNodeComponent } from "@/components/mindmap-node";
import { MindMapEdgeComponent } from "@/components/mindmap-edge";
import { MindMapProvider } from "@/lib/mindmap-context";
import { useMindMapLayout } from "@/hooks/use-mindmap-layout";
import { getNodeColor, ROOT_COLOR } from "@/lib/colors";

// nodeTypes/edgeTypes はコンポーネント外に定義して安定させる
const nodeTypes = { mindmap: MindMapNodeComponent };
const edgeTypes: EdgeTypes = { mindmap: MindMapEdgeComponent };

// 初期ノード（ルートのみ）
const INITIAL_NODES: MindMapNode[] = [
  {
    id: "root",
    type: "mindmap",
    position: { x: 0, y: 0 },
    data: {
      label: "メインテーマ",
      color: ROOT_COLOR,
      depth: 0,
      collapsed: false,
    },
  },
];

const INITIAL_EDGES: MindMapEdge[] = [];

let nodeIdCounter = 0;
function generateNodeId(): string {
  nodeIdCounter += 1;
  return `node-${Date.now()}-${nodeIdCounter}`;
}

// ノードのブランチインデックス（depth 1 のどの枝に属するか）
function getBranchIndex(
  nodeId: string,
  nodes: MindMapNode[],
  edges: MindMapEdge[]
): number {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const node = nodeMap.get(nodeId);
  if (!node || node.data.depth === 0) return 0;

  let currentId = nodeId;
  while (true) {
    const parentEdge = edges.find((e) => e.target === currentId);
    if (!parentEdge) return 0;
    const parent = nodeMap.get(parentEdge.source);
    if (!parent) return 0;
    if (parent.data.depth === 0) {
      const siblings = edges
        .filter((e) => e.source === parentEdge.source)
        .map((e) => e.target);
      return siblings.indexOf(currentId);
    }
    currentId = parentEdge.source;
  }
}

interface MindMapCanvasProps {
  direction: LayoutDirection;
}

export function MindMapCanvas({ direction }: MindMapCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<MindMapNode>(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState<MindMapEdge>(INITIAL_EDGES);
  const { fitView } = useReactFlow();
  const { calculateLayout } = useMindMapLayout();
  const layoutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 最新のノード・エッジを参照するための ref
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  // レイアウト再計算
  const recalculateLayout = useCallback(
    (
      currentNodes: MindMapNode[],
      currentEdges: MindMapEdge[],
      shouldFitView = false
    ) => {
      const { nodes: layoutNodes } = calculateLayout(
        currentNodes,
        currentEdges,
        direction
      );
      setNodes(layoutNodes);
      if (shouldFitView) {
        if (layoutTimeoutRef.current) clearTimeout(layoutTimeoutRef.current);
        layoutTimeoutRef.current = setTimeout(() => fitView({ padding: 0.3 }), 50);
      }
    },
    [calculateLayout, direction, fitView, setNodes]
  );

  // direction が変わったらレイアウト再計算
  useEffect(() => {
    recalculateLayout(nodesRef.current, edgesRef.current, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction]);

  // ラベル変更
  const handleLabelChange = useCallback(
    (nodeId: string, label: string) => {
      const updatedNodes = nodesRef.current.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, label } } : n
      );
      recalculateLayout(updatedNodes, edgesRef.current);
    },
    [recalculateLayout]
  );

  // 子ノード追加
  const handleAddChild = useCallback(
    (parentId: string) => {
      const currentNodes = nodesRef.current;
      const currentEdges = edgesRef.current;

      const parentNode = currentNodes.find((n) => n.id === parentId);
      if (!parentNode) return;

      const newId = generateNodeId();
      const newDepth = parentNode.data.depth + 1;
      const childCount = currentEdges.filter((e) => e.source === parentId).length;
      const branchIndex =
        newDepth === 1 ? childCount : getBranchIndex(parentId, currentNodes, currentEdges);
      const color = getNodeColor(newDepth, branchIndex);

      const newNode: MindMapNode = {
        id: newId,
        type: "mindmap",
        position: { x: 0, y: 0 },
        data: {
          label: "新しいノード",
          color,
          depth: newDepth,
          collapsed: false,
        },
      };

      const newEdge: MindMapEdge = {
        id: `edge-${parentId}-${newId}`,
        source: parentId,
        target: newId,
        type: "mindmap",
        data: { color: parentNode.data.color },
      };

      const updatedNodes = [...currentNodes, newNode];
      const updatedEdges = [...currentEdges, newEdge];

      setEdges(updatedEdges);
      recalculateLayout(updatedNodes, updatedEdges, true);
    },
    [setEdges, recalculateLayout]
  );

  // 兄弟ノード追加
  const handleAddSibling = useCallback(
    (nodeId: string) => {
      const parentEdge = edgesRef.current.find((e) => e.target === nodeId);
      if (!parentEdge) return;
      handleAddChild(parentEdge.source);
    },
    [handleAddChild]
  );

  // ノード削除（ルート以外）
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      const currentNodes = nodesRef.current;
      const currentEdges = edgesRef.current;

      const node = currentNodes.find((n) => n.id === nodeId);
      if (!node || node.data.depth === 0) return;

      const descendantIds = new Set<string>();
      const stack = [nodeId];
      while (stack.length > 0) {
        const current = stack.pop()!;
        descendantIds.add(current);
        const children = currentEdges
          .filter((e) => e.source === current)
          .map((e) => e.target);
        stack.push(...children);
      }

      const updatedNodes = currentNodes.filter((n) => !descendantIds.has(n.id));
      const updatedEdges = currentEdges.filter(
        (e) => !descendantIds.has(e.source) && !descendantIds.has(e.target)
      );

      setEdges(updatedEdges);
      recalculateLayout(updatedNodes, updatedEdges, true);
    },
    [setEdges, recalculateLayout]
  );

  // キーボードショートカット
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const selectedNode = nodesRef.current.find((n) => n.selected);
      if (!selectedNode) return;

      switch (event.key) {
        case "Tab": {
          event.preventDefault();
          handleAddChild(selectedNode.id);
          break;
        }
        case "Enter": {
          event.preventDefault();
          handleAddSibling(selectedNode.id);
          break;
        }
        case "Delete":
        case "Backspace": {
          if (
            !(event.target instanceof HTMLInputElement) &&
            !(event.target instanceof HTMLTextAreaElement)
          ) {
            event.preventDefault();
            handleDeleteNode(selectedNode.id);
          }
          break;
        }
      }
    },
    [handleAddChild, handleAddSibling, handleDeleteNode]
  );

  const onConnect: OnConnect = useCallback(() => {}, []);

  return (
    <MindMapProvider onLabelChange={handleLabelChange} onAddChild={handleAddChild} onAddSibling={handleAddSibling} direction={direction}>
      <div className="w-full h-full" onKeyDown={handleKeyDown} tabIndex={0}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{ type: "mindmap" }}
          connectionMode={ConnectionMode.Loose}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.1}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          deleteKeyCode={null}
        >
          <Panel position="bottom-center" className="text-xs text-gray-400">
            Tab: 子ノード追加 | Enter: 兄弟ノード追加 | Delete: ノード削除 |
            ダブルクリック: テキスト編集
          </Panel>
        </ReactFlow>
      </div>
    </MindMapProvider>
  );
}
