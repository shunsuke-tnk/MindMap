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
  const { onLabelChange, onAddChild, onAddSibling, direction, subscribeEdit } =
    useMindMapContext();
  const isHorizontal = direction === "horizontal";

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);

  const bgOpacity = getNodeBgOpacity(data.depth);
  const textColor = getTextColor(data.depth);
  const isRoot = data.depth === 0;

  useEffect(() => {
    if (!isEditing) {
      setEditText(data.label);
    }
  }, [data.label, isEditing]);

  // 外部からの編集リクエストを購読
  useEffect(() => {
    const unsubscribe = subscribeEdit(id, (trigger) => {
      if (trigger === "overwrite") {
        setEditText("");
      } else {
        setEditText(data.label);
      }
      setIsEditing(true);
    });
    return unsubscribe;
  }, [id, subscribeEdit, data.label]);

  // 編集モード開始時にフォーカス
  const prevEditingRef = useRef(false);
  useEffect(() => {
    if (isEditing && !prevEditingRef.current && inputRef.current) {
      inputRef.current.focus();
      if (editText !== "") {
        inputRef.current.select();
      }
    }
    prevEditingRef.current = isEditing;
  }, [isEditing, editText]);

  const commitEdit = useCallback(() => {
    setIsEditing(false);
    const newLabel = editText.trim() || data.label;
    if (newLabel !== data.label) {
      onLabelChange(id, newLabel);
    }
    setEditText(newLabel);
  }, [editText, data.label, id, onLabelChange]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditText(data.label);
  }, [data.label]);

  const handleDoubleClick = useCallback(() => {
    setEditText(data.label);
    setIsEditing(true);
  }, [data.label]);

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case "Enter":
          e.preventDefault();
          e.stopPropagation();
          commitEdit();
          onAddSibling(id);
          break;
        case "Escape":
          e.preventDefault();
          e.stopPropagation();
          cancelEdit();
          break;
        case "Tab":
          e.preventDefault();
          e.stopPropagation();
          commitEdit();
          onAddChild(id);
          break;
        default:
          e.stopPropagation();
          break;
      }
    },
    [commitEdit, cancelEdit, id, onAddChild, onAddSibling]
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
      {/* ツリー構造用ハンドル（透明、エッジ接続用） */}
      <Handle
        id="tree-target"
        type="target"
        position={isHorizontal ? Position.Left : Position.Top}
        className="!w-0 !h-0 !border-0 !bg-transparent"
      />

      {/* 関連線用ハンドル（4方向、ホバーで表示、source+target 両方） */}
      <Handle id="rel-top-src" type="source" position={Position.Top}
        className="!w-3 !h-3 !bg-indigo-300 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity !z-20" />
      <Handle id="rel-top-tgt" type="target" position={Position.Top}
        className="!w-3 !h-3 !bg-indigo-300 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity !z-20" style={{ left: "calc(50% + 8px)" }} />
      <Handle id="rel-bottom-src" type="source" position={Position.Bottom}
        className="!w-3 !h-3 !bg-indigo-300 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity !z-20" />
      <Handle id="rel-bottom-tgt" type="target" position={Position.Bottom}
        className="!w-3 !h-3 !bg-indigo-300 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity !z-20" style={{ left: "calc(50% + 8px)" }} />
      <Handle id="rel-left-src" type="source" position={Position.Left}
        className="!w-3 !h-3 !bg-indigo-300 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity !z-20" />
      <Handle id="rel-left-tgt" type="target" position={Position.Left}
        className="!w-3 !h-3 !bg-indigo-300 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity !z-20" style={{ top: "calc(50% + 8px)" }} />
      <Handle id="rel-right-src" type="source" position={Position.Right}
        className="!w-3 !h-3 !bg-indigo-300 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity !z-20" />
      <Handle id="rel-right-tgt" type="target" position={Position.Right}
        className="!w-3 !h-3 !bg-indigo-300 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity !z-20" style={{ top: "calc(50% + 8px)" }} />

      {/* ノード本体 — span が常にサイズを決定し、input は上に重ねる */}
      <div
        className="relative px-4 py-2 rounded-xl shadow-md min-w-[80px] max-w-[240px] text-center cursor-pointer overflow-hidden"
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
        {/* サイズ決定用のテキスト（常にレンダリング） */}
        <span
          className="whitespace-pre-wrap break-words select-none"
          style={{ visibility: isEditing ? "hidden" : "visible" }}
        >
          {data.label || "\u00A0"}
        </span>

        {/* 編集用 input（絶対配置でspan の上に重ねる） */}
        {isEditing && (
          <input
            ref={inputRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            className="absolute inset-0 bg-transparent outline-none text-center px-4 py-2 text-gray-900"
            style={{
              color: textColor,
              fontSize: "inherit",
              fontWeight: "inherit",
            }}
          />
        )}
      </div>

      {/* ツリー構造用ソースハンドル */}
      <Handle
        id="tree-source"
        type="source"
        position={isHorizontal ? Position.Right : Position.Bottom}
        className="!w-0 !h-0 !border-0 !bg-transparent"
      />

      {!data.collapsed && (
        <button
          onClick={handleAddChildClick}
          className={`absolute z-10 w-6 h-6 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-blue-500 hover:border-blue-300 text-sm ${
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
