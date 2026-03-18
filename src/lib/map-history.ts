"use client";

// localStorageに保存するマップ履歴
export interface MapRecord {
  roomId: string;
  name: string;
  lastVisited: string;
}

const STORAGE_KEY = "mindmap-history";

export function getMapHistory(): MapRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as MapRecord[];
  } catch {
    return [];
  }
}

export function saveMapVisit(roomId: string, name: string) {
  const history = getMapHistory();
  const existing = history.findIndex((m) => m.roomId === roomId);
  const record: MapRecord = {
    roomId,
    name: name || "無題のマップ",
    lastVisited: new Date().toISOString(),
  };

  if (existing >= 0) {
    history[existing] = record;
  } else {
    history.unshift(record);
  }

  // 最新順にソート、最大50件
  history.sort((a, b) => b.lastVisited.localeCompare(a.lastVisited));
  const trimmed = history.slice(0, 50);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function updateMapName(roomId: string, name: string) {
  const history = getMapHistory();
  const record = history.find((m) => m.roomId === roomId);
  if (record) {
    record.name = name;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }
}

export function deleteMapRecord(roomId: string) {
  const history = getMapHistory().filter((m) => m.roomId !== roomId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}
