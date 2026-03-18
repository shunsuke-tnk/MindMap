"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getMapHistory, deleteMapRecord, type MapRecord } from "@/lib/map-history";

export default function HomePage() {
  const router = useRouter();
  const [maps, setMaps] = useState<MapRecord[]>([]);

  useEffect(() => {
    setMaps(getMapHistory());
  }, []);

  const handleCreateMap = useCallback(() => {
    const roomId = crypto.randomUUID();
    router.push(`/map/${roomId}`);
  }, [router]);

  const handleDelete = useCallback((e: React.MouseEvent, roomId: string) => {
    e.stopPropagation();
    deleteMapRecord(roomId);
    setMaps(getMapHistory());
  }, []);

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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-pink-50">
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* ヘッダー */}
        <div className="text-center space-y-4 mb-12">
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-lg">
              <svg
                className="w-7 h-7 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-800">MindMap</h1>
          </div>
          <p className="text-lg text-gray-500">
            チームでリアルタイムに共同編集できるマインドマップツール
          </p>
          <button
            onClick={handleCreateMap}
            className="px-8 py-3 bg-indigo-500 text-white text-lg font-semibold rounded-2xl shadow-lg hover:bg-indigo-600 hover:shadow-xl transition-all duration-200 active:scale-95"
          >
            新しいマップを作る
          </button>
        </div>

        {/* マップ一覧 */}
        {maps.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              最近のマップ
            </h2>
            <div className="grid gap-2">
              {maps.map((map) => (
                <button
                  key={map.roomId}
                  onClick={() => router.push(`/map/${map.roomId}`)}
                  className="w-full text-left bg-white rounded-xl px-5 py-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-200 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-800 group-hover:text-indigo-600 transition-colors">
                        {map.name}
                      </span>
                      <span className="ml-3 text-xs text-gray-400">
                        {formatDate(map.lastVisited)}
                      </span>
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, map.roomId)}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 text-sm px-2 transition-opacity"
                      title="履歴から削除"
                    >
                      &times;
                    </button>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ショートカット */}
        <div className="flex justify-center gap-8 text-sm text-gray-400 mt-16">
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-white rounded border text-xs">Tab</kbd>
            <span>子ノード追加</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-white rounded border text-xs">Enter</kbd>
            <span>兄弟ノード追加</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-white rounded border text-xs">Delete</kbd>
            <span>ノード削除</span>
          </div>
        </div>
      </div>
    </div>
  );
}
