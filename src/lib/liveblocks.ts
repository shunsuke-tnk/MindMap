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
  // 独立ノード（ルート）の手動配置位置。子ノードはレイアウト計算で自動配置
  posX: number;
  posY: number;
};

// Liveblocks で同期するエッジデータ
export type StorageEdgeData = {
  id: string;
  source: string;
  target: string;
  color: string;
  // "tree" = 親子関係（マインドマップ構造）、"relation" = 関連線（矢印付き曲線）
  edgeType: "tree" | "relation";
};

// プレゼンス（カーソル位置・選択中ノード）
type Presence = {
  cursor: { x: number; y: number } | null;
  selectedNodeId: string | null;
  nickname: string;
};

// テキストコメントデータ
export type StorageCommentData = {
  id: string;
  text: string;
  posX: number;
  posY: number;
  color: string;
  bold: boolean;
  fontSize: "sm" | "md" | "lg";
};

// グループデータ
export type StorageGroupData = {
  id: string;
  label: string;
  color: string;
  nodeIds: string[];
};

// Storage の型定義
type Storage = {
  nodes: LiveMap<string, LiveObject<StorageNodeData>>;
  edges: LiveMap<string, LiveObject<StorageEdgeData>>;
  comments: LiveMap<string, LiveObject<StorageCommentData>>;
  groups: LiveMap<string, LiveObject<StorageGroupData>>;
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
