"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMapHistory, deleteMapRecord, type MapRecord } from "@/lib/map-history";

interface MapSidebarProps {
  currentRoomId: string;
  isOpen: boolean;
  onToggle: () => void;
}

export function MapSidebar({ currentRoomId, isOpen, onToggle }: MapSidebarProps) {
  const [maps, setMaps] = useState<MapRecord[]>([]);
  const router = useRouter();

  useEffect(() => {
    setMaps(getMapHistory());
  }, []);

  // 定期的に更新（他タブでの変更を反映）
  useEffect(() => {
    const interval = setInterval(() => setMaps(getMapHistory()), 3000);
    return () => clearInterval(interval);
  }, []);

  const handleNavigate = useCallback(
    (roomId: string) => {
      if (roomId !== currentRoomId) {
        router.push(`/map/${roomId}`);
      }
    },
    [currentRoomId, router]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent, roomId: string) => {
      e.stopPropagation();
      deleteMapRecord(roomId);
      setMaps(getMapHistory());
    },
    []
  );

  const handleNewMap = useCallback(() => {
    const roomId = crypto.randomUUID();
    router.push(`/map/${roomId}`);
  }, [router]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "たった今";
    if (diffMin < 60) return `${diffMin}分前`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}時間前`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay}日前`;
    return d.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
  };

  return (
    <>
      {/* トグルボタン（常に表示） */}
      <button
        onClick={onToggle}
        className="absolute left-3 top-3 z-30 w-8 h-8 bg-white rounded-lg shadow-md border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
        title="マップ一覧"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      </button>

      {/* サイドバー */}
      <div
        className={`absolute left-0 top-0 h-full z-20 bg-white border-r border-gray-200 shadow-lg transition-transform duration-200 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ width: 260 }}
      >
        <div className="flex items-center justify-between p-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">マップ一覧</h2>
          <button
            onClick={onToggle}
            className="text-gray-400 hover:text-gray-600 text-lg"
          >
            &times;
          </button>
        </div>

        <div className="p-2">
          <button
            onClick={handleNewMap}
            className="w-full px-3 py-2 text-sm text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors text-left"
          >
            + 新しいマップを作成
          </button>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: "calc(100% - 100px)" }}>
          {maps.length === 0 ? (
            <p className="px-4 py-8 text-sm text-gray-400 text-center">
              まだマップがありません
            </p>
          ) : (
            maps.map((map) => (
              <button
                key={map.roomId}
                onClick={() => handleNavigate(map.roomId)}
                className={`w-full text-left px-4 py-2.5 text-sm border-b border-gray-50 hover:bg-gray-50 transition-colors group ${
                  map.roomId === currentRoomId ? "bg-indigo-50" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-medium truncate ${
                      map.roomId === currentRoomId
                        ? "text-indigo-600"
                        : "text-gray-700"
                    }`}
                  >
                    {map.name}
                  </span>
                  <button
                    onClick={(e) => handleDelete(e, map.roomId)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 text-xs ml-2 transition-opacity"
                    title="履歴から削除"
                  >
                    &times;
                  </button>
                </div>
                <span className="text-xs text-gray-400">
                  {formatDate(map.lastVisited)}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}
