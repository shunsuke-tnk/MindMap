"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type NodeProps, type Node } from "@xyflow/react";
import { CommentToolbar } from "@/components/comment-toolbar";

interface CommentNodeData extends Record<string, unknown> {
  text: string;
  color: string;
  bold: boolean;
  fontSize: "sm" | "md" | "lg";
  onCommentChange?: (id: string, text: string) => void;
  onCommentDelete?: (id: string) => void;
  onStyleChange?: (id: string, style: Partial<{ bold: boolean; color: string; fontSize: "sm" | "md" | "lg" }>) => void;
}

export type CommentNode = Node<CommentNodeData, "comment">;

const FONT_SIZE_MAP: Record<string, string> = {
  sm: "12px",
  md: "15px",
  lg: "20px",
};

export function CommentNodeComponent({
  id,
  data,
  selected,
}: NodeProps<CommentNode>) {
  const { text, color, bold, fontSize, onCommentChange, onCommentDelete, onStyleChange } = data;
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(text);
  const [startedEditing, setStartedEditing] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setEditText(text);
    }
  }, [text, isEditing]);

  // 新規作成時は即編集モード
  useEffect(() => {
    if (text === "" && !startedEditing) {
      setIsEditing(true);
      setStartedEditing(true);
    }
  }, [text, startedEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (editText) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  const commitEdit = useCallback(() => {
    setIsEditing(false);
    const newText = editText.trim();
    if (newText && newText !== text) {
      onCommentChange?.(id, newText);
    } else if (!newText) {
      onCommentDelete?.(id);
    } else {
      setEditText(text);
    }
  }, [editText, text, onCommentChange, onCommentDelete, id]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    if (!text) {
      onCommentDelete?.(id);
    } else {
      setEditText(text);
    }
  }, [text, onCommentDelete, id]);

  const handleDoubleClick = useCallback(() => {
    setEditText(text);
    setIsEditing(true);
  }, [text]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      e.stopPropagation();
      if (e.key === "Escape") {
        e.preventDefault();
        cancelEdit();
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        commitEdit();
      }
    },
    [commitEdit, cancelEdit]
  );

  const handleBlur = useCallback(() => {
    commitEdit();
  }, [commitEdit]);

  const fontSizePx = FONT_SIZE_MAP[fontSize] ?? FONT_SIZE_MAP.md;

  return (
    <div className="relative" onDoubleClick={handleDoubleClick}>
      {selected && !isEditing && onStyleChange && (
        <CommentToolbar
          commentId={id}
          bold={bold}
          color={color}
          fontSize={fontSize}
          onStyleChange={onStyleChange}
        />
      )}

      {isEditing ? (
        <textarea
          ref={inputRef}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="bg-transparent outline-none resize-none min-w-[60px] min-h-[24px]"
          style={{
            color,
            fontSize: fontSizePx,
            fontWeight: bold ? 700 : 400,
            width: Math.max(60, editText.length * parseInt(fontSizePx) * 0.7 + 20),
          }}
          rows={editText.split("\n").length || 1}
        />
      ) : (
        <div
          className="whitespace-pre-wrap break-words cursor-text select-none min-w-[20px] min-h-[16px]"
          style={{
            color,
            fontSize: fontSizePx,
            fontWeight: bold ? 700 : 400,
          }}
        >
          {text || "\u00A0"}
        </div>
      )}
    </div>
  );
}
