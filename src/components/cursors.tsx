"use client";

import { useOthers } from "@/lib/liveblocks";

// ユーザーごとのカーソル色
const CURSOR_COLORS = [
  "#E91E63", // Pink
  "#2196F3", // Blue
  "#4CAF50", // Green
  "#FF9800", // Orange
  "#9C27B0", // Purple
  "#00BCD4", // Cyan
  "#FF5722", // Deep Orange
  "#3F51B5", // Indigo
] as const;

export function Cursors() {
  const others = useOthers();

  return (
    <>
      {others.map(({ connectionId, presence }) => {
        if (!presence.cursor) return null;

        const color = CURSOR_COLORS[connectionId % CURSOR_COLORS.length];
        const nickname = presence.nickname || `ユーザー ${connectionId}`;

        return (
          <div
            key={connectionId}
            className="pointer-events-none fixed z-50 transition-transform duration-75"
            style={{
              left: presence.cursor.x,
              top: presence.cursor.y,
            }}
          >
            {/* カーソル矢印 */}
            <svg
              width="24"
              height="36"
              viewBox="0 0 24 36"
              fill="none"
              className="drop-shadow-md"
            >
              <path
                d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
                fill={color}
                stroke="white"
                strokeWidth="1"
              />
            </svg>

            {/* ニックネームラベル */}
            <div
              className="absolute top-5 left-4 px-2 py-0.5 rounded-full text-xs text-white whitespace-nowrap shadow-sm"
              style={{ backgroundColor: color }}
            >
              {nickname}
            </div>
          </div>
        );
      })}
    </>
  );
}

// 接続中のユーザー数を表示するバッジ
export function ConnectionBadge() {
  const others = useOthers();
  const count = others.length;

  if (count === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      {/* アバター */}
      <div className="flex -space-x-2">
        {others.slice(0, 3).map(({ connectionId, presence }) => {
          const color = CURSOR_COLORS[connectionId % CURSOR_COLORS.length];
          const initial = (presence.nickname || "?")[0].toUpperCase();
          return (
            <div
              key={connectionId}
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs text-white font-semibold border-2 border-white"
              style={{ backgroundColor: color }}
              title={presence.nickname || `ユーザー ${connectionId}`}
            >
              {initial}
            </div>
          );
        })}
        {count > 3 && (
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs text-gray-600 font-semibold bg-gray-200 border-2 border-white">
            +{count - 3}
          </div>
        )}
      </div>
      <span className="text-xs text-gray-500">{count + 1}人が参加中</span>
    </div>
  );
}
