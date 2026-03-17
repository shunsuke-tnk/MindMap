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
  SelectionMode,
  MarkerType,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { LiveObject } from "@liveblocks/client";

import type {
  MindMapNode,
  MindMapEdge,
  LayoutDirection,
} from "@/types/mindmap";
import { MindMapNodeComponent } from "@/components/mindmap-node";
import { MindMapEdgeComponent } from "@/components/mindmap-edge";
import { RelationEdgeComponent } from "@/components/relation-edge";
import { GroupOverlay } from "@/components/group-overlay";
import { MindMapProvider } from "@/lib/mindmap-context";
import { useMindMapLayout } from "@/hooks/use-mindmap-layout";
import { getNodeColor, ROOT_COLOR } from "@/lib/colors";
import type { CanvasMode } from "@/components/mode-panel";
import {
  useStorage,
  useMutation,
  useUpdateMyPresence,
  type StorageNodeData,
  type StorageEdgeData,
} from "@/lib/liveblocks";

const nodeTypes = { mindmap: MindMapNodeComponent };
const edgeTypes: EdgeTypes = {
  mindmap: MindMapEdgeComponent,
  relation: RelationEdgeComponent,
};

let nodeIdCounter = 0;
function generateNodeId(): string {
  nodeIdCounter += 1;
  return `node-${Date.now()}-${nodeIdCounter}`;
}

function getBranchIndex(
  nodeId: string,
  nodesMap: Map<string, StorageNodeData>,
  edgesArr: StorageEdgeData[]
): number {
  const node = nodesMap.get(nodeId);
  if (!node || node.depth === 0) return 0;

  let currentId = nodeId;
  while (true) {
    const parentEdge = edgesArr.find((e) => e.target === currentId);
    if (!parentEdge) return 0;
    const parent = nodesMap.get(parentEdge.source);
    if (!parent) return 0;
    if (parent.depth === 0) {
      const siblings = edgesArr
        .filter((e) => e.source === parentEdge.source)
        .map((e) => e.target);
      return siblings.indexOf(currentId);
    }
    currentId = parentEdge.source;
  }
}

function storageToReactFlow(
  storageNodes: ReadonlyMap<string, StorageNodeData>,
  storageEdges: ReadonlyMap<string, StorageEdgeData>
): { nodes: MindMapNode[]; edges: MindMapEdge[] } {
  const nodes: MindMapNode[] = [];
  storageNodes.forEach((data) => {
    nodes.push({
      id: data.id,
      type: "mindmap",
      position: { x: data.posX ?? 0, y: data.posY ?? 0 },
      data: {
        label: data.label,
        color: data.color,
        depth: data.depth,
        collapsed: data.collapsed,
      },
    });
  });

  // ツリーエッジと関連線を分けて処理
  const treeEdges: MindMapEdge[] = [];
  const relationEdges: MindMapEdge[] = [];
  storageEdges.forEach((data) => {
    const edgeType = data.edgeType ?? "tree";
    if (edgeType === "relation") {
      relationEdges.push({
        id: data.id,
        source: data.source,
        target: data.target,
        type: "relation",
        data: { color: data.color },
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: data.color },
      });
    } else {
      treeEdges.push({
        id: data.id,
        source: data.source,
        target: data.target,
        type: "mindmap",
        data: { color: data.color },
      });
    }
  });

  return { nodes, edges: [...treeEdges, ...relationEdges] };
}

interface MindMapCanvasLiveProps {
  direction: LayoutDirection;
  mode: CanvasMode;
  onSelectionChange?: (selectedIds: string[]) => void;
}

export function MindMapCanvasLive({ direction, mode, onSelectionChange }: MindMapCanvasLiveProps) {
  const storageNodes = useStorage((root) => root.nodes);
  const storageEdges = useStorage((root) => root.edges);
  const updatePresence = useUpdateMyPresence();

  const [nodes, setNodes, onNodesChange] = useNodesState<MindMapNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<MindMapEdge>([]);
  const reactFlowInstance = useReactFlow();
  const { fitView } = reactFlowInstance;
  const { calculateLayout } = useMindMapLayout();
  const layoutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevStorageRef = useRef<string>("");

  // 追加直後に編集モードに入るノードID を保持する ref
  const pendingEditNodeRef = useRef<string | null>(null);
  // requestEdit 関数を保持する ref（MindMapProvider 経由で取得）
  const requestEditRef = useRef<
    ((nodeId: string, trigger: "select" | "overwrite") => void) | null
  >(null);

  // Storage が変更されたらレイアウト再計算
  useEffect(() => {
    if (!storageNodes || !storageEdges) return;

    const key = JSON.stringify({
      nodes: Array.from(storageNodes.entries()),
      edges: Array.from(storageEdges.entries()),
    });
    if (key === prevStorageRef.current) return;
    prevStorageRef.current = key;

    const { nodes: rfNodes, edges: rfEdges } = storageToReactFlow(
      storageNodes,
      storageEdges
    );
    const { nodes: layoutNodes } = calculateLayout(rfNodes, rfEdges, direction);

    // 追加直後のノードがあれば、それを選択状態にする
    const pendingId = pendingEditNodeRef.current;
    if (pendingId) {
      const updated = layoutNodes.map((n) => ({
        ...n,
        selected: n.id === pendingId,
      }));
      setNodes(updated);
    } else {
      setNodes(layoutNodes);
    }
    setEdges(rfEdges);

    if (layoutTimeoutRef.current) clearTimeout(layoutTimeoutRef.current);
    layoutTimeoutRef.current = setTimeout(() => {
      fitView({ padding: 0.3 });
      // レイアウト確定後に編集モードに入る
      if (pendingId && requestEditRef.current) {
        requestEditRef.current(pendingId, "overwrite");
        pendingEditNodeRef.current = null;
      }
    }, 120);
  }, [storageNodes, storageEdges, direction, calculateLayout, setNodes, setEdges, fitView]);

  // ラベル変更
  const handleLabelChange = useMutation(
    ({ storage }, nodeId: string, label: string) => {
      const nodesMap = storage.get("nodes");
      const node = nodesMap.get(nodeId);
      if (node) {
        node.set("label", label);
      }
    },
    []
  );

  // 子ノード追加 → 追加後に即座に編集モードに入る
  const addChildAndEdit = useMutation(
    ({ storage }, parentId: string) => {
      const nodesMap = storage.get("nodes");
      const edgesMap = storage.get("edges");
      const parentNode = nodesMap.get(parentId);
      if (!parentNode) return null;

      const parentData = parentNode.toObject();
      const newId = generateNodeId();
      const newDepth = parentData.depth + 1;

      const edgesArr: StorageEdgeData[] = [];
      edgesMap.forEach((e) => edgesArr.push(e.toObject()));

      const nodesDataMap = new Map<string, StorageNodeData>();
      nodesMap.forEach((n, key) => nodesDataMap.set(key, n.toObject()));

      const childCount = edgesArr.filter((e) => e.source === parentId).length;
      const branchIndex =
        newDepth === 1
          ? childCount
          : getBranchIndex(parentId, nodesDataMap, edgesArr);
      const color = getNodeColor(newDepth, branchIndex);

      nodesMap.set(
        newId,
        new LiveObject<StorageNodeData>({
          id: newId,
          label: " ",
          color,
          depth: newDepth,
          collapsed: false,
          posX: 0,
          posY: 0,
        })
      );

      const edgeId = `edge-${parentId}-${newId}`;
      edgesMap.set(
        edgeId,
        new LiveObject<StorageEdgeData>({
          id: edgeId,
          source: parentId,
          target: newId,
          color: parentData.color,
          edgeType: "tree",
        })
      );

      return newId;
    },
    []
  );

  // 子ノード追加のラッパー（編集モード遷移を含む）
  const handleAddChild = useCallback(
    (parentId: string) => {
      const newId = addChildAndEdit(parentId);
      if (newId) {
        pendingEditNodeRef.current = newId;
      }
    },
    [addChildAndEdit]
  );

  // 兄弟ノード追加（編集モード遷移を含む）
  const handleAddSibling = useCallback(
    (nodeId: string) => {
      if (!storageEdges) return;
      let parentSource: string | null = null;
      storageEdges.forEach((edge: StorageEdgeData) => {
        if (edge.target === nodeId) {
          parentSource = edge.source;
        }
      });
      if (parentSource) {
        handleAddChild(parentSource);
      }
    },
    [storageEdges, handleAddChild]
  );

  // ノード削除（複数ノード対応）
  const handleDeleteNodes = useCallback(
    (nodeIds: string[]) => {
      if (!storageNodes || !storageEdges) return;

      const edgesArr: StorageEdgeData[] = [];
      storageEdges.forEach((e: StorageEdgeData) => edgesArr.push(e));

      const allIdsToDelete = new Set<string>();
      for (const nodeId of nodeIds) {
        const node = storageNodes.get(nodeId);
        if (!node) continue;
        // 最初のルートノード（初期作成）は削除不可、追加ルートは削除可能
        if (node.depth === 0) {
          // ツリーエッジでソースになっている（子がある）初期ルートは保護
          const hasChildren = edgesArr.some(
            (e) => e.source === nodeId && (e.edgeType ?? "tree") === "tree"
          );
          const isOriginalRoot = storageNodes.size > 1 && hasChildren;
          // ノードが1つしかない場合も削除不可
          if (storageNodes.size <= 1 || isOriginalRoot) continue;
        }

        // 対象ノードとその子孫すべてを収集
        const stack = [nodeId];
        while (stack.length > 0) {
          const current = stack.pop()!;
          allIdsToDelete.add(current);
          const children = edgesArr
            .filter((e) => e.source === current)
            .map((e) => e.target);
          stack.push(...children);
        }
      }

      if (allIdsToDelete.size > 0) {
        deleteNodesMutation(Array.from(allIdsToDelete));
      }
    },
    [storageNodes, storageEdges]
  );

  const deleteNodesMutation = useMutation(
    ({ storage }, idsToDelete: string[]) => {
      const nodesMap = storage.get("nodes");
      const edgesMap = storage.get("edges");
      const idsSet = new Set(idsToDelete);

      for (const id of idsToDelete) {
        nodesMap.delete(id);
      }

      const edgeKeysToDelete: string[] = [];
      edgesMap.forEach((edge, key) => {
        const data = edge.toObject();
        if (idsSet.has(data.source) || idsSet.has(data.target)) {
          edgeKeysToDelete.push(key);
        }
      });
      for (const key of edgeKeysToDelete) {
        edgesMap.delete(key);
      }
    },
    []
  );

  // XMind風キーボードショートカット
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      // 編集中（input/textareaにフォーカス）は何もしない
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const selectedNodes = nodes.filter((n) => n.selected);
      if (selectedNodes.length === 0) return;

      switch (event.key) {
        // Tab: 子ノード追加 + 即座に編集モード（最後に選択したノードが対象）
        case "Tab": {
          event.preventDefault();
          handleAddChild(selectedNodes[selectedNodes.length - 1].id);
          break;
        }
        // Enter: 兄弟ノード追加 + 即座に編集モード
        case "Enter": {
          event.preventDefault();
          handleAddSibling(selectedNodes[selectedNodes.length - 1].id);
          break;
        }
        // Delete/Backspace: 選択中の全ノードを削除
        case "Delete":
        case "Backspace": {
          event.preventDefault();
          handleDeleteNodes(selectedNodes.map((n) => n.id));
          break;
        }
        // F2/Space: テキスト編集モード開始（単一選択時のみ）
        case "F2":
        case " ": {
          if (selectedNodes.length === 1) {
            event.preventDefault();
            if (requestEditRef.current) {
              requestEditRef.current(selectedNodes[0].id, "select");
            }
          }
          break;
        }
        // それ以外の印字可能文字: 編集モード開始（テキスト全選択 → 入力で置換）
        default: {
          if (
            selectedNodes.length === 1 &&
            event.key.length === 1 &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey
          ) {
            event.preventDefault();
            if (requestEditRef.current) {
              requestEditRef.current(selectedNodes[0].id, "select");
            }
          }
          break;
        }
      }
    },
    [nodes, handleAddChild, handleAddSibling, handleDeleteNodes]
  );

  // マウス移動でプレゼンス更新
  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      const bounds = event.currentTarget.getBoundingClientRect();
      updatePresence({
        cursor: {
          x: Math.round(event.clientX - bounds.left),
          y: Math.round(event.clientY - bounds.top),
        },
      });
    },
    [updatePresence]
  );

  const handleMouseLeave = useCallback(() => {
    updatePresence({ cursor: null });
  }, [updatePresence]);

  // ノード選択時にプレゼンス更新 + 親コンポーネントに通知
  const handleSelectionChange = useCallback(() => {
    const selectedIds = nodes.filter((n) => n.selected).map((n) => n.id);
    updatePresence({ selectedNodeId: selectedIds[0] ?? null });
    onSelectionChange?.(selectedIds);
  }, [nodes, updatePresence, onSelectionChange]);

  useEffect(() => {
    handleSelectionChange();
  }, [handleSelectionChange]);

  // 関連線（矢印）の接続ハンドラ
  const addRelationEdge = useMutation(
    ({ storage }, sourceId: string, targetId: string) => {
      const edgesMap = storage.get("edges");
      const edgeId = `relation-${sourceId}-${targetId}-${Date.now()}`;
      edgesMap.set(
        edgeId,
        new LiveObject<StorageEdgeData>({
          id: edgeId,
          source: sourceId,
          target: targetId,
          color: "#94A3B8",
          edgeType: "relation",
        })
      );
    },
    []
  );

  const onConnect: OnConnect = useCallback(
    (params) => {
      if (params.source && params.target && params.source !== params.target) {
        addRelationEdge(params.source, params.target);
      }
    },
    [addRelationEdge]
  );

  // 空白ダブルクリックで独立ノード追加
  const addIndependentNode = useMutation(
    ({ storage }, posX: number, posY: number) => {
      const nodesMap = storage.get("nodes");
      const newId = generateNodeId();

      // 独立ノードの色をサイクリックに割り当て
      const rootCount = Array.from(nodesMap.values()).filter(
        (n) => n.toObject().depth === 0
      ).length;
      const colors = [ROOT_COLOR, "#8B5CF6", "#059669", "#DC2626", "#0891B2", "#D97706"];
      const color = colors[rootCount % colors.length];

      nodesMap.set(
        newId,
        new LiveObject<StorageNodeData>({
          id: newId,
          label: "新しいテーマ",
          color,
          depth: 0,
          collapsed: false,
          posX,
          posY,
        })
      );
      return newId;
    },
    []
  );

  // ペーンのダブルクリック検知（onPaneClick ベース）
  const lastPaneClickRef = useRef<{ time: number; x: number; y: number }>({ time: 0, x: 0, y: 0 });

  const handlePaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (mode !== "pointer") return;
      const now = Date.now();
      const last = lastPaneClickRef.current;
      const isDoubleClick =
        now - last.time < 400 &&
        Math.abs(event.clientX - last.x) < 10 &&
        Math.abs(event.clientY - last.y) < 10;

      lastPaneClickRef.current = { time: now, x: event.clientX, y: event.clientY };

      if (!isDoubleClick) return;

      // ダブルクリック確定 → 独立ノード作成
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const newId = addIndependentNode(position.x, position.y);
      if (newId) {
        pendingEditNodeRef.current = newId;
      }
    },
    [mode, addIndependentNode, reactFlowInstance]
  );

  if (!storageNodes || !storageEdges) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400">
        読み込み中...
      </div>
    );
  }

  return (
    <MindMapProviderWithRef
      onLabelChange={handleLabelChange}
      onAddChild={handleAddChild}
      onAddSibling={handleAddSibling}
      direction={direction}
      requestEditRef={requestEditRef}
    >
      <div
        className={`w-full h-full ${mode === "hand" ? "cursor-grab active:cursor-grabbing" : ""}`}
        onKeyDown={handleKeyDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        tabIndex={0}
      >
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
          panOnDrag={mode === "hand"}
          selectionOnDrag={mode === "pointer"}
          selectionMode={SelectionMode.Partial}
          nodesDraggable={mode === "pointer"}
          elementsSelectable={mode === "pointer"}
          nodesConnectable={mode === "pointer"}
          onPaneClick={handlePaneClick}
        >
          <GroupOverlay selectedNodeIds={nodes.filter((n) => n.selected).map((n) => n.id)} />
          <Panel position="bottom-center" className="text-xs text-gray-400">
            Enter: 兄弟追加 | Tab: 子追加 | Delete: 削除 | Ctrl+L:
            関連線 | Ctrl+]: グループ
          </Panel>
        </ReactFlow>
      </div>
    </MindMapProviderWithRef>
  );
}

// requestEdit ref を外部に公開するラッパー
function MindMapProviderWithRef({
  children,
  onLabelChange,
  onAddChild,
  onAddSibling,
  direction,
  requestEditRef,
}: {
  children: React.ReactNode;
  onLabelChange: (nodeId: string, label: string) => void;
  onAddChild: (parentId: string) => void;
  onAddSibling: (nodeId: string) => void;
  direction: LayoutDirection;
  requestEditRef: React.MutableRefObject<
    ((nodeId: string, trigger: "select" | "overwrite") => void) | null
  >;
}) {
  return (
    <MindMapProvider
      onLabelChange={onLabelChange}
      onAddChild={onAddChild}
      onAddSibling={onAddSibling}
      direction={direction}
    >
      <RequestEditBridge requestEditRef={requestEditRef} />
      {children}
    </MindMapProvider>
  );
}

// Provider 内部で requestEdit を ref に橋渡しするコンポーネント
function RequestEditBridge({
  requestEditRef,
}: {
  requestEditRef: React.MutableRefObject<
    ((nodeId: string, trigger: "select" | "overwrite") => void) | null
  >;
}) {
  const { requestEdit } = useMindMapContext();
  requestEditRef.current = requestEdit;
  return null;
}

// useMindMapContext をここでインポート（循環参照を避けるため関数内で使用）
import { useMindMapContext } from "@/lib/mindmap-context";
