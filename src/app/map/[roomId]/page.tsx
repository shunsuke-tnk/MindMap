"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { ReactFlowProvider, useReactFlow } from "@xyflow/react";
import { LiveMap, LiveObject } from "@liveblocks/client";
import { MindMapCanvasLive } from "@/components/mindmap-canvas-live";
import { Toolbar } from "@/components/toolbar";
import { ModePanel, type CanvasMode } from "@/components/mode-panel";
import { Cursors, ConnectionBadge } from "@/components/cursors";
import { NicknameDialog } from "@/components/nickname-dialog";
import { useGroupActions } from "@/components/group-overlay";
import { RoomProvider, useUpdateMyPresence, useUndo, useRedo, useStorage, useMutation } from "@/lib/liveblocks";
import type { StorageNodeData, StorageEdgeData, StorageCommentData, StorageGroupData } from "@/lib/liveblocks";
import type { LayoutDirection } from "@/types/mindmap";
import { ROOT_COLOR } from "@/lib/colors";
import { exportToPdf } from "@/lib/export";
import { saveToFile, loadFromFile, type MindMapFileData } from "@/lib/save-load";
import { MapSidebar } from "@/components/map-sidebar";
import { saveMapVisit } from "@/lib/map-history";

function getInitialStorage() {
  const nodes = new LiveMap<string, LiveObject<StorageNodeData>>();
  nodes.set(
    "root",
    new LiveObject<StorageNodeData>({
      id: "root",
      label: "メインテーマ",
      color: ROOT_COLOR,
      depth: 0,
      collapsed: false,
      posX: 0,
      posY: 0,
    })
  );

  const edges = new LiveMap<string, LiveObject<StorageEdgeData>>();
  const comments = new LiveMap<string, LiveObject<StorageCommentData>>();
  const groups = new LiveMap<string, LiveObject<StorageGroupData>>();
  const mapName = new LiveObject({ value: "無題のマップ" });

  return { nodes, edges, comments, groups, mapName };
}

function RoomContent({ roomId }: { roomId: string }) {
  const [direction, setDirection] = useState<LayoutDirection>("horizontal");
  const [mode, setMode] = useState<CanvasMode>("pointer");
  const [nickname, setNickname] = useState<string | null>(null);
  const [selectedCount, setSelectedCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const selectedIdsRef = useRef<string[]>([]);
  const updatePresence = useUpdateMyPresence();
  const { createGroup } = useGroupActions();
  const undo = useUndo();
  const redo = useRedo();
  const storageNodes = useStorage((root) => root.nodes);
  const storageEdges = useStorage((root) => root.edges);
  const storageGroups = useStorage((root) => {
    try { return root.groups; } catch { return null; }
  });
  const storageComments = useStorage((root) => {
    try { return root.comments; } catch { return null; }
  });
  const storageMapName = useStorage((root) => {
    try { return root.mapName; } catch { return null; }
  });

  // JSON保存
  const handleSave = useCallback(() => {
    if (!storageNodes || !storageEdges) return;
    const nodes: Record<string, StorageNodeData> = {};
    storageNodes.forEach((v: StorageNodeData, k: string) => { nodes[k] = v; });
    const edges: Record<string, StorageEdgeData> = {};
    storageEdges.forEach((v: StorageEdgeData, k: string) => { edges[k] = v; });
    const groups: Record<string, StorageGroupData> = {};
    if (storageGroups) storageGroups.forEach((v: StorageGroupData, k: string) => { groups[k] = v; });
    const comments: Record<string, StorageCommentData> = {};
    if (storageComments) storageComments.forEach((v: StorageCommentData, k: string) => { comments[k] = v; });

    const data: MindMapFileData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      nodes, edges, groups, comments,
      mapName: (storageMapName as { value: string } | null)?.value ?? "無題のマップ",
    };
    saveToFile(data, data.mapName);
  }, [storageNodes, storageEdges, storageGroups, storageComments, storageMapName]);

  // JSON読み込み
  const loadFileData = useMutation(
    ({ storage }, fileData: MindMapFileData) => {
      const nodesMap = storage.get("nodes");
      const edgesMap = storage.get("edges");

      // 既存データをクリア
      nodesMap.forEach((_: unknown, key: string) => nodesMap.delete(key));
      edgesMap.forEach((_: unknown, key: string) => edgesMap.delete(key));

      // ファイルのデータを復元
      for (const [key, val] of Object.entries(fileData.nodes)) {
        nodesMap.set(key, new LiveObject(val));
      }
      for (const [key, val] of Object.entries(fileData.edges)) {
        edgesMap.set(key, new LiveObject(val));
      }

      // グループ復元
      try {
        const groupsMap = storage.get("groups");
        groupsMap.forEach((_: unknown, key: string) => groupsMap.delete(key));
        for (const [key, val] of Object.entries(fileData.groups ?? {})) {
          groupsMap.set(key, new LiveObject(val));
        }
      } catch { /* groups未対応ルーム */ }

      // コメント復元
      try {
        const commentsMap = storage.get("comments");
        commentsMap.forEach((_: unknown, key: string) => commentsMap.delete(key));
        for (const [key, val] of Object.entries(fileData.comments ?? {})) {
          commentsMap.set(key, new LiveObject(val));
        }
      } catch { /* comments未対応ルーム */ }

      // マップ名復元
      try {
        const mapName = storage.get("mapName");
        mapName.set("value", fileData.mapName);
      } catch { /* mapName未対応 */ }
    },
    []
  );

  const handleLoad = useCallback(async () => {
    try {
      const data = await loadFromFile();
      loadFileData(data);
    } catch (e) {
      // ユーザーがキャンセルした場合は何もしない
    }
  }, [loadFileData]);

  // PDFエクスポート
  const handleExportPdf = useCallback(() => {
    exportToPdf("mindmap");
  }, []);

  const handleNicknameSubmit = useCallback(
    (name: string) => {
      setNickname(name);
      updatePresence({ nickname: name });
      saveMapVisit(roomId, "無題のマップ");
    },
    [updatePresence, roomId]
  );

  // グローバルキーボードショートカット（H/V でモード切替）
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // input/textarea 内では無視
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === "h" || e.key === "H") {
        setMode("hand");
      }
      if (e.key === "v" || e.key === "V") {
        setMode("pointer");
      }
      if (e.key === "t" || e.key === "T") {
        setMode("text");
      }
      // Ctrl+] or Cmd+] → グループ化
      if (e.key === "]" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const ids = selectedIdsRef.current;
        if (ids.length >= 2) {
          createGroup(ids, "");
        }
      }
      // Cmd+Z → Undo
      if (e.key === "z" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Cmd+Y or Cmd+Shift+Z → Redo
      if (
        (e.key === "y" && (e.ctrlKey || e.metaKey)) ||
        (e.key === "z" && (e.ctrlKey || e.metaKey) && e.shiftKey)
      ) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [createGroup, undo, redo]);

  const handleSelectionUpdate = useCallback((ids: string[]) => {
    selectedIdsRef.current = ids;
    setSelectedCount(ids.length);
  }, []);

  const handleGroupSelected = useCallback(() => {
    const ids = selectedIdsRef.current;
    if (ids.length < 2) return;
    createGroup(ids, "");
  }, [createGroup]);

  if (!nickname) {
    return <NicknameDialog onSubmit={handleNicknameSubmit} />;
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50">
      <ReactFlowProvider>
        <Toolbar
          direction={direction}
          onDirectionChange={setDirection}
          onGroupSelected={handleGroupSelected}
          hasSelection={selectedCount >= 2}
          onSave={handleSave}
          onLoad={handleLoad}
          onExportPdf={handleExportPdf}
        >
          <ConnectionBadge />
        </Toolbar>
        <div className="flex-1 relative overflow-hidden">
          <MapSidebar
            currentRoomId={roomId}
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
          />
          <ModePanel mode={mode} onModeChange={setMode} />
          <MindMapCanvasLive
            direction={direction}
            mode={mode}
            onSelectionChange={handleSelectionUpdate}
          />
          <Cursors />
        </div>
      </ReactFlowProvider>
    </div>
  );
}

export default function MapPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{
        cursor: null,
        selectedNodeId: null,
        nickname: "",
      }}
      initialStorage={getInitialStorage}
    >
      <RoomContent roomId={roomId} />
    </RoomProvider>
  );
}
