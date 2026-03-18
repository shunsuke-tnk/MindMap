# アーキテクチャ概要

## システム構成

MindMap は Next.js（App Router）で構築されたリアルタイム共同編集マインドマップツールです。

```
[ブラウザ A]                    [ブラウザ B]
    |                               |
    v                               v
[Next.js App (Client Component)]   [Next.js App (Client Component)]
    |                               |
    +--- React Flow --- カスタムノード描画
    |                               |
    +--- d3-flextree --- レイアウト計算
    |                               |
    +--- Liveblocks SDK --- useStorage / useMutation / useOthers
    |                               |
    +---------- Liveblocks Cloud ----------+
               |            |
        Storage (永続化)  Presence (カーソル共有)
```

## データの流れ

1. ユーザーがトップページで「新しいマップを作る」をクリック
2. UUID が生成され、`/map/[roomId]` に遷移
3. Liveblocks RoomProvider が roomId でルームに接続
4. ユーザーがノードを追加・編集すると、`useMutation` で Liveblocks Storage に書き込み
5. Storage の変更が全接続クライアントにリアルタイム配信
6. 各クライアントで d3-flextree がレイアウトを再計算し、React Flow が描画を更新

## ディレクトリ構成の方針

- `src/app/` — ページとルーティング（Next.js App Router）
- `src/components/` — マインドマップUI コンポーネント
- `src/hooks/` — レイアウト計算などのカスタムフック
- `src/lib/` — Liveblocks 設定、色パレットなどのユーティリティ
- `src/types/` — TypeScript 型定義

## 外部サービス連携

| サービス | 用途 | 無料枠 |
|---------|------|--------|
| Liveblocks | リアルタイム同期、プレゼンス、永続化 | 月500ルーム |

## 状態管理の方針

**Single Source of Truth: Liveblocks Storage**

React Flow は自身の内部状態を持つが、Liveblocks Storage を唯一の信頼源とする。
ノード/エッジの変更は `useMutation` 経由で Storage に書き込み、
Storage の変更を `useStorage` で購読して React Flow の状態を更新する。

## 今後の拡張ポイント

- 認証の追加: Liveblocks の `liveblocks.auth` エンドポイントでトークンベースのアクセス制御
- エクスポート: React Flow の `toObject()` でマップデータを取得し、画像/PDF変換
- 同期レイヤーの差し替え: Liveblocks → Yjs への移行が必要になった場合、描画レイヤーはそのまま維持可能
