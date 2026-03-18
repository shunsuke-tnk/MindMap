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
import { RoomProvider, useUpdateMyPresence } from "@/lib/liveblocks";
import type { StorageNodeData, StorageEdgeData, StorageCommentData, StorageGroupData } from "@/lib/liveblocks";
import type { LayoutDirection } from "@/types/mindmap";
import { ROOT_COLOR } from "@/lib/colors";

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

function RoomContent() {
  const [direction, setDirection] = useState<LayoutDirection>("horizontal");
  const [mode, setMode] = useState<CanvasMode>("pointer");
  const [nickname, setNickname] = useState<string | null>(null);
  const [selectedCount, setSelectedCount] = useState(0);
  const selectedIdsRef = useRef<string[]>([]);
  const updatePresence = useUpdateMyPresence();
  const { createGroup } = useGroupActions();

  const handleNicknameSubmit = useCallback(
    (name: string) => {
      setNickname(name);
      updatePresence({ nickname: name });
    },
    [updatePresence]
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
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [createGroup]);

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
        >
          <ConnectionBadge />
        </Toolbar>
        <div className="flex-1 relative">
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
      <RoomContent />
    </RoomProvider>
  );
}
