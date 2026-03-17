"use client";

import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import type { LiveMap, LiveObject } from "@liveblocks/client";

// Liveblocks で同期するノードデータ（type を使用: LsonObject の index signature 制約対応）
export type StorageNodeData = {
  id: string;
  label: string;
  color: string;
  depth: number;
  collapsed: boolean;
};

// Liveblocks で同期するエッジデータ
export type StorageEdgeData = {
  id: string;
  source: string;
  target: string;
  color: string;
};

// プレゼンス（カーソル位置・選択中ノード）
type Presence = {
  cursor: { x: number; y: number } | null;
  selectedNodeId: string | null;
  nickname: string;
};

// Storage の型定義
type Storage = {
  nodes: LiveMap<string, LiveObject<StorageNodeData>>;
  edges: LiveMap<string, LiveObject<StorageEdgeData>>;
  mapName: LiveObject<{ value: string }>;
};

const client = createClient({
  publicApiKey: process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY!,
});

export const {
  RoomProvider,
  useMyPresence,
  useUpdateMyPresence,
  useStorage,
  useMutation,
  useOthers,
  useSelf,
  useStatus,
  useRoom,
} = createRoomContext<Presence, Storage>(client);
