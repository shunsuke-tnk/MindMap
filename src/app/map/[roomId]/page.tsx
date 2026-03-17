"use client";

import { use, useCallback, useEffect, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { LiveMap, LiveObject } from "@liveblocks/client";
import { MindMapCanvasLive } from "@/components/mindmap-canvas-live";
import { Toolbar } from "@/components/toolbar";
import { ModePanel, type CanvasMode } from "@/components/mode-panel";
import { Cursors, ConnectionBadge } from "@/components/cursors";
import { NicknameDialog } from "@/components/nickname-dialog";
import { RoomProvider, useUpdateMyPresence } from "@/lib/liveblocks";
import type { StorageNodeData, StorageEdgeData } from "@/lib/liveblocks";
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
    })
  );

  const edges = new LiveMap<string, LiveObject<StorageEdgeData>>();
  const mapName = new LiveObject({ value: "無題のマップ" });

  return { nodes, edges, mapName };
}

function RoomContent() {
  const [direction, setDirection] = useState<LayoutDirection>("horizontal");
  const [mode, setMode] = useState<CanvasMode>("pointer");
  const [nickname, setNickname] = useState<string | null>(null);
  const updatePresence = useUpdateMyPresence();

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
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  if (!nickname) {
    return <NicknameDialog onSubmit={handleNicknameSubmit} />;
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50">
      <ReactFlowProvider>
        <Toolbar direction={direction} onDirectionChange={setDirection}>
          <ConnectionBadge />
        </Toolbar>
        <div className="flex-1 relative">
          <ModePanel mode={mode} onModeChange={setMode} />
          <MindMapCanvasLive direction={direction} mode={mode} />
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
