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
const edgeTypes: EdgeTypes = { mindmap: MindMapEdgeComponent };

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
      position: { x: 0, y: 0 },
      data: {
        label: data.label,
        color: data.color,
        depth: data.depth,
        collapsed: data.collapsed,
      },
    });
  });

  const edges: MindMapEdge[] = [];
  storageEdges.forEach((data) => {
    edges.push({
      id: data.id,
      source: data.source,
      target: data.target,
      type: "mindmap",
      data: { color: data.color },
    });
  });

  return { nodes, edges };
}

interface MindMapCanvasLiveProps {
  direction: LayoutDirection;
  mode: CanvasMode;
}

export function MindMapCanvasLive({ direction, mode }: MindMapCanvasLiveProps) {
  const storageNodes = useStorage((root) => root.nodes);
  const storageEdges = useStorage((root) => root.edges);
  const updatePresence = useUpdateMyPresence();

  const [nodes, setNodes, onNodesChange] = useNodesState<MindMapNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<MindMapEdge>([]);
  const { fitView, setCenter } = useReactFlow();
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
          label: "",
          color,
          depth: newDepth,
          collapsed: false,
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

  // ノード削除
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      if (!storageNodes || !storageEdges) return;
      const node = storageNodes.get(nodeId);
      if (!node || node.depth === 0) return;

      const edgesArr: StorageEdgeData[] = [];
      storageEdges.forEach((e: StorageEdgeData) => edgesArr.push(e));

      const descendantIds = new Set<string>();
      const stack = [nodeId];
      while (stack.length > 0) {
        const current = stack.pop()!;
        descendantIds.add(current);
        const children = edgesArr
          .filter((e) => e.source === current)
          .map((e) => e.target);
        stack.push(...children);
      }

      deleteNodesMutation(Array.from(descendantIds));
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

      const selectedNode = nodes.find((n) => n.selected);
      if (!selectedNode) return;

      switch (event.key) {
        // Tab: 子ノード追加 + 即座に編集モード
        case "Tab": {
          event.preventDefault();
          handleAddChild(selectedNode.id);
          break;
        }
        // Enter: 兄弟ノード追加 + 即座に編集モード
        case "Enter": {
          event.preventDefault();
          handleAddSibling(selectedNode.id);
          break;
        }
        // Delete/Backspace: ノード削除
        case "Delete":
        case "Backspace": {
          event.preventDefault();
          handleDeleteNode(selectedNode.id);
          break;
        }
        // F2/Space: テキスト編集モード開始（テキスト選択状態）
        case "F2":
        case " ": {
          event.preventDefault();
          if (requestEditRef.current) {
            requestEditRef.current(selectedNode.id, "select");
          }
          break;
        }
        // それ以外の印字可能文字: 直接入力で上書き編集モード開始
        default: {
          if (
            event.key.length === 1 &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey
          ) {
            event.preventDefault();
            if (requestEditRef.current) {
              requestEditRef.current(selectedNode.id, "overwrite");
              // 最初の1文字を入力するため、少し遅延してからキーを送る
              setTimeout(() => {
                const activeInput = document.querySelector(
                  ".react-flow__node.selected input"
                ) as HTMLInputElement | null;
                if (activeInput) {
                  activeInput.value = event.key;
                  activeInput.dispatchEvent(
                    new Event("input", { bubbles: true })
                  );
                  // React の onChange を発火させるために nativeInputValueSetter を使う
                  const nativeSetter = Object.getOwnPropertyDescriptor(
                    window.HTMLInputElement.prototype,
                    "value"
                  )?.set;
                  if (nativeSetter) {
                    nativeSetter.call(activeInput, event.key);
                    activeInput.dispatchEvent(
                      new Event("input", { bubbles: true })
                    );
                  }
                }
              }, 50);
            }
          }
          break;
        }
      }
    },
    [nodes, handleAddChild, handleAddSibling, handleDeleteNode]
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

  // ノード選択時にプレゼンス更新
  const handleSelectionChange = useCallback(() => {
    const selected = nodes.find((n) => n.selected);
    updatePresence({ selectedNodeId: selected?.id ?? null });
  }, [nodes, updatePresence]);

  useEffect(() => {
    handleSelectionChange();
  }, [handleSelectionChange]);

  const onConnect: OnConnect = useCallback(() => {}, []);

  // requestEdit をコンテキストから受け取って ref に保持するためのラッパー
  const handleRequestEdit = useCallback(
    (nodeId: string, trigger: "select" | "overwrite") => {
      // この関数は MindMapProvider 経由で呼ばれる
      // 実際の処理は subscribeEdit で各ノードが購読している
    },
    []
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
          nodesConnectable={false}
        >
          <Panel position="bottom-center" className="text-xs text-gray-400">
            Enter: 兄弟追加 | Tab: 子追加 | Delete: 削除 | Space/F2:
            編集 | H: ハンド | V: ポインター
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
  direction,
  requestEditRef,
}: {
  children: React.ReactNode;
  onLabelChange: (nodeId: string, label: string) => void;
  onAddChild: (parentId: string) => void;
  direction: LayoutDirection;
  requestEditRef: React.MutableRefObject<
    ((nodeId: string, trigger: "select" | "overwrite") => void) | null
  >;
}) {
  return (
    <MindMapProvider
      onLabelChange={onLabelChange}
      onAddChild={onAddChild}
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
