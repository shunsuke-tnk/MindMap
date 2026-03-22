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
  PanOnScrollMode,
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
import { CommentNodeComponent } from "@/components/comment-node";
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
  type StorageCommentData,
} from "@/lib/liveblocks";

const nodeTypes = {
  mindmap: MindMapNodeComponent,
  comment: CommentNodeComponent,
};
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
        sourceHandle: data.sourceHandle,
        targetHandle: data.targetHandle,
        type: "relation",
        data: { color: data.color },
        animated: true,
        interactionWidth: 20,
        markerEnd: { type: MarkerType.ArrowClosed, color: data.color },
      });
    } else {
      treeEdges.push({
        id: data.id,
        source: data.source,
        target: data.target,
        sourceHandle: "tree-source",
        targetHandle: "tree-target",
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
  const storageComments = useStorage((root) => {
    try { return root.comments; } catch { return null; }
  });
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

  // コメントテキスト変更
  const handleCommentChange = useMutation(
    ({ storage }, commentId: string, text: string) => {
      const commentsMap = storage.get("comments");
      const comment = commentsMap.get(commentId);
      if (comment) {
        comment.set("text", text);
      }
    },
    []
  );

  // コメント削除
  const handleCommentDelete = useMutation(
    ({ storage }, commentId: string) => {
      const commentsMap = storage.get("comments");
      commentsMap.delete(commentId);
    },
    []
  );

  // コメントスタイル変更（太字・色・サイズ）
  const handleCommentStyleChange = useMutation(
    ({ storage }, commentId: string, style: Partial<{ bold: boolean; color: string; fontSize: "sm" | "md" | "lg" }>) => {
      const commentsMap = storage.get("comments");
      const comment = commentsMap.get(commentId);
      if (!comment) return;
      if (style.bold !== undefined) comment.set("bold", style.bold);
      if (style.color !== undefined) comment.set("color", style.color);
      if (style.fontSize !== undefined) comment.set("fontSize", style.fontSize);
    },
    []
  );

  // レイアウト計算後に全ノードの位置を一括保存
  const saveAllNodePositions = useMutation(
    ({ storage }, positions: Array<{ id: string; x: number; y: number }>) => {
      const nodesMap = storage.get("nodes");
      for (const pos of positions) {
        const node = nodesMap.get(pos.id);
        if (node) {
          node.set("posX", pos.x);
          node.set("posY", pos.y);
        }
      }
    },
    []
  );

  // Storage が変更されたらレイアウト再計算
  useEffect(() => {
    if (!storageNodes || !storageEdges) return;

    const key = JSON.stringify({
      nodes: Array.from(storageNodes.entries()),
      edges: Array.from(storageEdges.entries()),
      comments: storageComments ? Array.from(storageComments.entries()) : "none",
    });
    if (key === prevStorageRef.current) return;
    prevStorageRef.current = key;

    const { nodes: rfNodes, edges: rfEdges } = storageToReactFlow(
      storageNodes,
      storageEdges
    );

    // 常にレイアウト計算を実行し、一貫した配置を保つ
    const { nodes: layoutNodes } = calculateLayout(rfNodes, rfEdges, direction);

    // レイアウト計算後の位置を Storage に保存（次回の変更検知で無限ループしないよう、
    // 位置が変わったノードのみ更新）
    const positionsToSave: Array<{ id: string; x: number; y: number }> = [];
    for (const ln of layoutNodes) {
      const original = rfNodes.find((n) => n.id === ln.id);
      if (!original) continue;
      const dx = Math.abs(ln.position.x - original.position.x);
      const dy = Math.abs(ln.position.y - original.position.y);
      if (dx > 0.5 || dy > 0.5) {
        positionsToSave.push({ id: ln.id, x: ln.position.x, y: ln.position.y });
      }
    }
    if (positionsToSave.length > 0) {
      saveAllNodePositions(positionsToSave);
    }

    // コメントノードを追加
    const commentNodes: MindMapNode[] = [];
    if (storageComments) {
      storageComments.forEach((data: StorageCommentData) => {
        commentNodes.push({
          id: data.id,
          type: "comment",
          position: { x: data.posX, y: data.posY },
          data: {
            text: data.text,
            color: data.color,
            bold: data.bold,
            fontSize: data.fontSize,
            onCommentChange: handleCommentChange,
            onCommentDelete: handleCommentDelete,
            onStyleChange: handleCommentStyleChange,
            label: data.text,
            depth: -1,
            collapsed: false,
          },
          draggable: true,
        });
      });
    }

    const allNodes = [...layoutNodes, ...commentNodes];

    // 追加直後のノードがあれば、それを選択状態にする
    const pendingId = pendingEditNodeRef.current;
    if (pendingId) {
      const updated = allNodes.map((n) => ({
        ...n,
        selected: n.id === pendingId,
      }));
      setNodes(updated);
    } else {
      setNodes(allNodes);
    }
    setEdges(rfEdges);

    if (layoutTimeoutRef.current) clearTimeout(layoutTimeoutRef.current);
    if (pendingId) {
      layoutTimeoutRef.current = setTimeout(() => {
        fitView({ padding: 0.3 });
        if (requestEditRef.current) {
          requestEditRef.current(pendingId, "overwrite");
          pendingEditNodeRef.current = null;
        }
      }, 120);
    }
  }, [storageNodes, storageEdges, storageComments, direction, calculateLayout, setNodes, setEdges, fitView, handleCommentChange, handleCommentDelete, handleCommentStyleChange, saveAllNodePositions]);

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

      const mindmapIdsToDelete = new Set<string>();
      const commentIdsToDelete: string[] = [];

      for (const nodeId of nodeIds) {
        // コメントノードの場合
        if (nodeId.startsWith("comment-")) {
          commentIdsToDelete.push(nodeId);
          continue;
        }

        const node = storageNodes.get(nodeId);
        if (!node) continue;
        if (node.depth === 0) {
          const hasChildren = edgesArr.some(
            (e) => e.source === nodeId && (e.edgeType ?? "tree") === "tree"
          );
          const isOriginalRoot = storageNodes.size > 1 && hasChildren;
          if (storageNodes.size <= 1 || isOriginalRoot) continue;
        }

        const stack = [nodeId];
        while (stack.length > 0) {
          const current = stack.pop()!;
          mindmapIdsToDelete.add(current);
          const children = edgesArr
            .filter((e) => e.source === current)
            .map((e) => e.target);
          stack.push(...children);
        }
      }

      if (mindmapIdsToDelete.size > 0) {
        deleteNodesMutation(Array.from(mindmapIdsToDelete));
      }
      for (const id of commentIdsToDelete) {
        handleCommentDelete(id);
      }
    },
    [storageNodes, storageEdges, handleCommentDelete]
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

  // 関連矢印（relation edge）の削除
  const deleteRelationEdge = useMutation(
    ({ storage }, edgeId: string) => {
      const edgesMap = storage.get("edges");
      edgesMap.delete(edgeId);
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
        // Delete/Backspace: 選択中の全ノード＋関連矢印を削除
        case "Delete":
        case "Backspace": {
          event.preventDefault();
          handleDeleteNodes(selectedNodes.map((n) => n.id));
          // 選択中の relation edge も削除
          const selectedEdges = edges.filter((e) => e.selected && e.type === "relation");
          for (const edge of selectedEdges) {
            deleteRelationEdge(edge.id);
          }
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
    [nodes, edges, handleAddChild, handleAddSibling, handleDeleteNodes, deleteRelationEdge]
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
    ({ storage }, sourceId: string, targetId: string, srcHandle?: string, tgtHandle?: string) => {
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
          sourceHandle: srcHandle,
          targetHandle: tgtHandle,
        })
      );
    },
    []
  );

  const onConnect: OnConnect = useCallback(
    (params) => {
      if (params.source && params.target && params.source !== params.target) {
        addRelationEdge(
          params.source,
          params.target,
          params.sourceHandle ?? undefined,
          params.targetHandle ?? undefined
        );
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

  // マインドマップノードのドラッグ終了時に位置を保存
  const updateNodePosition = useMutation(
    ({ storage }, nodeId: string, posX: number, posY: number) => {
      const nodesMap = storage.get("nodes");
      const node = nodesMap.get(nodeId);
      if (node) {
        node.set("posX", posX);
        node.set("posY", posY);
      }
    },
    []
  );

  // コメントノードのドラッグ終了時に位置を保存
  const updateCommentPosition = useMutation(
    ({ storage }, commentId: string, posX: number, posY: number) => {
      const commentsMap = storage.get("comments");
      const comment = commentsMap.get(commentId);
      if (comment) {
        comment.set("posX", posX);
        comment.set("posY", posY);
      }
    },
    []
  );

  const handleNodeDragStop = useCallback(
    (_: React.MouseEvent, node: MindMapNode) => {
      if (node.type === "comment") {
        updateCommentPosition(node.id, node.position.x, node.position.y);
      } else {
        updateNodePosition(node.id, node.position.x, node.position.y);
      }
    },
    [updateCommentPosition, updateNodePosition]
  );

  // コメント追加
  const addComment = useMutation(
    ({ storage }, posX: number, posY: number) => {
      const commentsMap = storage.get("comments");
      const commentId = `comment-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      commentsMap.set(
        commentId,
        new LiveObject<StorageCommentData>({
          id: commentId,
          text: "",
          posX,
          posY,
          color: "#374151",
          bold: false,
          fontSize: "md",
        })
      );
      return commentId;
    },
    []
  );

  // ペーンのダブルクリック検知（onPaneClick ベース）
  const lastPaneClickRef = useRef<{ time: number; x: number; y: number }>({ time: 0, x: 0, y: 0 });

  const handlePaneClick = useCallback(
    (event: React.MouseEvent) => {
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // テキストモード: シングルクリックでコメント追加
      if (mode === "text") {
        addComment(position.x, position.y);
        return;
      }

      if (mode !== "pointer") return;

      // ポインターモード: ダブルクリックで独立ノード追加
      const now = Date.now();
      const last = lastPaneClickRef.current;
      const isDoubleClick =
        now - last.time < 400 &&
        Math.abs(event.clientX - last.x) < 10 &&
        Math.abs(event.clientY - last.y) < 10;

      lastPaneClickRef.current = { time: now, x: event.clientX, y: event.clientY };

      if (!isDoubleClick) return;

      const newId = addIndependentNode(position.x, position.y);
      if (newId) {
        pendingEditNodeRef.current = newId;
      }
    },
    [mode, addIndependentNode, addComment, reactFlowInstance]
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
        className={`w-full h-full ${mode === "hand" ? "cursor-grab active:cursor-grabbing" : mode === "text" ? "cursor-text" : ""}`}
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
          onNodeDragStop={handleNodeDragStop}
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
          edgesFocusable={true}
          panOnDrag={mode === "hand"}
          panOnScroll={mode === "pointer" || mode === "text"}
          panOnScrollMode={PanOnScrollMode.Free}
          selectionOnDrag={mode === "pointer"}
          selectionMode={SelectionMode.Partial}
          nodesDraggable={mode === "pointer" || mode === "text"}
          elementsSelectable={mode === "pointer" || mode === "text"}
          nodesConnectable={mode === "pointer"}
          onPaneClick={handlePaneClick}
        >
          <GroupOverlay selectedNodeIds={nodes.filter((n) => n.selected).map((n) => n.id)} />
          <Panel position="bottom-center" className="text-xs text-gray-400">
            Enter: 兄弟追加 | Tab: 子追加 | Delete: 削除 | T:
            テキスト | H: ハンド | V: ポインター
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
