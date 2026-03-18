"use client";

import type { StorageNodeData, StorageEdgeData, StorageGroupData, StorageCommentData } from "@/lib/liveblocks";

// 保存データの型
export interface MindMapFileData {
  version: 1;
  exportedAt: string;
  nodes: Record<string, StorageNodeData>;
  edges: Record<string, StorageEdgeData>;
  groups: Record<string, StorageGroupData>;
  comments: Record<string, StorageCommentData>;
  mapName: string;
}

// JSONファイルとしてダウンロード
export function saveToFile(data: MindMapFileData, filename = "mindmap") {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = `${filename}.json`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

// JSONファイルを読み込み
export function loadFromFile(): Promise<MindMapFileData> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error("ファイルが選択されませんでした"));
        return;
      }
      try {
        const text = await file.text();
        const data = JSON.parse(text) as MindMapFileData;
        if (!data.version || !data.nodes) {
          reject(new Error("無効なマインドマップファイルです"));
          return;
        }
        resolve(data);
      } catch {
        reject(new Error("ファイルの読み込みに失敗しました"));
      }
    };
    input.click();
  });
}
