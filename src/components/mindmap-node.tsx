"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { MindMapNode } from "@/types/mindmap";
import { getNodeBgOpacity, getTextColor } from "@/lib/colors";
import { useMindMapContext } from "@/lib/mindmap-context";

export function MindMapNodeComponent({
  id,
  data,
  selected,
}: NodeProps<MindMapNode>) {
  const { onLabelChange, onAddChild, direction, subscribeEdit } =
    useMindMapContext();
  const isHorizontal = direction === "horizontal";

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);

  const bgOpacity = getNodeBgOpacity(data.depth);
  const textColor = getTextColor(data.depth);
  const isRoot = data.depth === 0;

  // data.label が外部から更新されたら同期
  useEffect(() => {
    if (!isEditing) {
      setEditText(data.label);
    }
  }, [data.label, isEditing]);

  // 外部からの編集リクエストを購読
  useEffect(() => {
    const unsubscribe = subscribeEdit(id, (trigger) => {
      if (trigger === "overwrite") {
        // 上書きモード: テキストを空にして編集開始
        setEditText("");
        setIsEditing(true);
      } else {
        // 選択モード（F2/Space/ダブルクリック）: テキストを選択して編集開始
        setEditText(data.label);
        setIsEditing(true);
      }
    });
    return unsubscribe;
  }, [id, subscribeEdit, data.label]);

  // 編集モード開始時にフォーカスとテキスト選択
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // "select" トリガーの場合は全選択、"overwrite" の場合はカーソルを末尾に
      if (editText === "") {
        // overwrite mode: カーソルが末尾（空文字なので関係なし）
      } else {
        inputRef.current.select();
      }
    }
  }, [isEditing, editText]);

  // 編集確定
  const commitEdit = useCallback(() => {
    setIsEditing(false);
    const newLabel = editText.trim() || data.label;
    if (newLabel !== data.label) {
      onLabelChange(id, newLabel);
    }
    setEditText(newLabel);
  }, [editText, data.label, id, onLabelChange]);

  // 編集キャンセル
  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditText(data.label);
  }, [data.label]);

  // ダブルクリック → 編集モード（テキスト選択）
  const handleDoubleClick = useCallback(() => {
    setEditText(data.label);
    setIsEditing(true);
  }, [data.label]);

  // 編集中のキー操作
  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case "Enter":
          e.preventDefault();
          e.stopPropagation();
          commitEdit();
          break;
        case "Escape":
          e.preventDefault();
          e.stopPropagation();
          cancelEdit();
          break;
        case "Tab":
          // 編集中のTabは確定して子ノード追加に委譲
          e.preventDefault();
          e.stopPropagation();
          commitEdit();
          // キャンバス側のTabハンドラが処理する
          break;
        default:
          // 編集中の他のキーはキャンバスに伝播させない
          e.stopPropagation();
          break;
      }
    },
    [commitEdit, cancelEdit]
  );

  const handleInputBlur = useCallback(() => {
    commitEdit();
  }, [commitEdit]);

  const handleAddChildClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onAddChild(id);
    },
    [id, onAddChild]
  );

  return (
    <div className="relative group" onDoubleClick={handleDoubleClick}>
      {/* 入力ハンドル（ルート以外） */}
      {!isRoot && (
        <Handle
          type="target"
          position={isHorizontal ? Position.Left : Position.Top}
          className="!w-0 !h-0 !border-0 !bg-transparent"
        />
      )}

      {/* ノード本体 */}
      <div
        className="px-4 py-2 rounded-xl shadow-md transition-all duration-200 min-w-[80px] max-w-[240px] text-center cursor-pointer"
        style={{
          backgroundColor: data.color,
          opacity: bgOpacity,
          color: textColor,
          borderWidth: selected ? 3 : 1,
          borderColor: selected ? "#1D4ED8" : "transparent",
          borderStyle: "solid",
          fontSize: isRoot ? "16px" : data.depth === 1 ? "14px" : "13px",
          fontWeight: isRoot ? 700 : data.depth === 1 ? 600 : 400,
        }}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            className="bg-transparent outline-none text-center w-full"
            style={{ color: textColor }}
          />
        ) : (
          <span className="select-none whitespace-pre-wrap break-words">
            {data.label}
          </span>
        )}
      </div>

      {/* 出力ハンドル */}
      <Handle
        type="source"
        position={isHorizontal ? Position.Right : Position.Bottom}
        className="!w-0 !h-0 !border-0 !bg-transparent"
      />

      {/* 子ノード追加ボタン（ホバー時に表示） */}
      {!data.collapsed && (
        <button
          onClick={handleAddChildClick}
          className={`absolute w-6 h-6 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-blue-500 hover:border-blue-300 text-sm ${
            isHorizontal
              ? "-right-3 top-1/2 -translate-y-1/2"
              : "-bottom-3 left-1/2 -translate-x-1/2"
          }`}
        >
          +
        </button>
      )}
    </div>
  );
}
