"use client";

import { createContext, useContext, useCallback, useRef } from "react";
import type { LayoutDirection } from "@/types/mindmap";

// ノードの編集開始モード
type EditTrigger = "select" | "overwrite";

interface MindMapContextValue {
  onLabelChange: (nodeId: string, label: string) => void;
  onAddChild: (parentId: string) => void;
  direction: LayoutDirection;
  // ノードの編集状態を外部から制御するための仕組み
  requestEdit: (nodeId: string, trigger: EditTrigger) => void;
  subscribeEdit: (nodeId: string, callback: (trigger: EditTrigger) => void) => () => void;
}

const MindMapContext = createContext<MindMapContextValue>({
  onLabelChange: () => {},
  onAddChild: () => {},
  direction: "horizontal",
  requestEdit: () => {},
  subscribeEdit: () => () => {},
});

export function MindMapProvider({
  children,
  onLabelChange,
  onAddChild,
  direction,
}: Omit<MindMapContextValue, "requestEdit" | "subscribeEdit"> & {
  children: React.ReactNode;
}) {
  // ノードID → コールバックのマップ（ref で管理して再レンダリングを避ける）
  const listenersRef = useRef<Map<string, (trigger: EditTrigger) => void>>(new Map());

  const requestEdit = useCallback((nodeId: string, trigger: EditTrigger) => {
    const callback = listenersRef.current.get(nodeId);
    if (callback) callback(trigger);
  }, []);

  const subscribeEdit = useCallback(
    (nodeId: string, callback: (trigger: EditTrigger) => void) => {
      listenersRef.current.set(nodeId, callback);
      return () => {
        listenersRef.current.delete(nodeId);
      };
    },
    []
  );

  return (
    <MindMapContext.Provider
      value={{ onLabelChange, onAddChild, direction, requestEdit, subscribeEdit }}
    >
      {children}
    </MindMapContext.Provider>
  );
}

export function useMindMapContext(): MindMapContextValue {
  return useContext(MindMapContext);
}
