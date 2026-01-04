/**
 * SequenceView コンポーネント
 *
 * シーケンス図タブのメインビュー
 * Mermaidを使用してシーケンス図をレンダリングする
 * 編集機能（グループ化、省略、ラベル編集）を提供
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import type { ItemId } from '@/types/schema';
import type {
  FunctionDepthSetting,
  CallInfo,
  SequenceEditState,
  SequenceGroup,
  CallEntryId,
  SavedSequenceDiagram,
  HoverTarget,
} from '@/types/sequence';
import { generateCallEntryId } from '@/types/sequence';
import { extractDisplayName, extractMethodName } from '@/services/mermaidGenerator';
import { attachCallEntryIds, applyHighlight } from '@/services/sequenceHighlightService';
import { DepthControl } from './DepthControl';
import { SequenceToolbar } from './SequenceToolbar';
import { CallList } from './CallList';
import { EditActionsPanel } from './EditActionsPanel';
import { GroupList } from './GroupList';
import { GroupDialog } from './GroupDialog';
import { LabelEditDialog } from './LabelEditDialog';
import { SaveDialog } from './SaveDialog';
import { OpenDialog } from './OpenDialog';

// ============================================
// Props定義
// ============================================

interface SequenceViewProps {
  /** 起点関数ID */
  rootFunctionId: ItemId | null;
  /** 関数ごとの深さ設定（ルート関数は除外済み） */
  functionDepths: FunctionDepthSetting[];
  /** 生成されたMermaidコード */
  mermaidCode: string | null;
  /** 関数深さ変更時のコールバック */
  onFunctionDepthChange: (functionId: ItemId, depth: number) => void;
  /** アクティベーションを使用するか */
  useActivation: boolean;
  /** アクティベーション設定の切り替えコールバック */
  onToggleActivation: () => void;

  // === 編集機能用props ===

  /** 呼び出し一覧（省略含む全ての呼び出し） */
  calls: CallInfo[];
  /** 描画された呼び出し（ハイライト用、SVGと一致） */
  renderedCalls: CallInfo[];
  /** 編集状態 */
  editState: SequenceEditState;
  /** 未保存の変更があるか */
  hasUnsavedChanges: boolean;

  // グループ操作
  onAddGroup: (name: string, callEntryIds: CallEntryId[]) => void;
  onRemoveGroup: (groupId: string) => void;
  onUpdateGroup: (groupId: string, updates: Partial<SequenceGroup>) => void;
  onToggleGroupCollapse: (groupId: string) => void;

  // 省略操作
  onAddOmission: (callEntryIds: CallEntryId[], placeholder?: string) => void;

  // ラベル操作
  onSetLabelEdit: (callEntryId: CallEntryId, customLabel: string) => void;
  onRemoveLabelEdit: (callEntryId: CallEntryId) => void;

  // クリア
  onClearEdits: () => void;

  // 名前付き保存/開く
  savedSequences: SavedSequenceDiagram[];
  onSaveWithName: (name: string, existingId?: string) => void;
  onOpenSaved: (saved: SavedSequenceDiagram) => void;
  onDeleteSaved: (id: string) => void;
}

// Mermaid初期化
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  sequence: {
    diagramMarginX: 50,
    diagramMarginY: 10,
    actorMargin: 50,
    width: 150,
    height: 65,
    boxMargin: 10,
    boxTextMargin: 5,
    noteMargin: 10,
    messageMargin: 35,
  },
});

// ============================================
// ダイアログ状態の型
// ============================================

interface GroupDialogState {
  isOpen: boolean;
  mode: 'create' | 'edit';
  groupId?: string;
  currentName?: string;
}

interface LabelDialogState {
  isOpen: boolean;
  callEntryId: CallEntryId;
  originalLabel: string;
  currentLabel: string;
}

// ============================================
// メインコンポーネント
// ============================================

export function SequenceView({
  rootFunctionId,
  functionDepths,
  mermaidCode,
  onFunctionDepthChange,
  useActivation,
  onToggleActivation,
  calls,
  renderedCalls,
  editState,
  hasUnsavedChanges,
  onAddGroup,
  onRemoveGroup,
  onUpdateGroup,
  onToggleGroupCollapse,
  onAddOmission,
  onSetLabelEdit,
  onRemoveLabelEdit,
  onClearEdits,
  savedSequences,
  onSaveWithName,
  onOpenSaved,
  onDeleteSaved,
}: SequenceViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [isContainerReady, setIsContainerReady] = useState(false);

  // 選択状態
  const [selectedCallIds, setSelectedCallIds] = useState<Set<CallEntryId>>(new Set());

  // ホバー状態（シーケンス図ハイライト用）
  const [hoverTarget, setHoverTarget] = useState<HoverTarget>(null);

  // ダイアログ状態
  const [groupDialog, setGroupDialog] = useState<GroupDialogState>({
    isOpen: false,
    mode: 'create',
  });
  const [labelDialog, setLabelDialog] = useState<LabelDialogState | null>(null);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isOpenDialogOpen, setIsOpenDialogOpen] = useState(false);

  // ズーム状態
  const [scale, setScale] = useState(1);

  // パン（ドラッグスクロール）状態
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // ズーム操作ハンドラ
  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + 0.1, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => Math.max(prev - 0.1, 0.1));
  }, []);

  const handleZoomReset = useCallback(() => {
    setScale(1);
  }, []);

  const handleZoomChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setScale(Math.min(Math.max(value / 100, 0.1), 3));
    }
  }, []);

  // ホイールズームハンドラ（Ctrl+ホイール、マウス位置中心）
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      // Ctrlが押されていない場合は通常スクロール
      if (!e.ctrlKey) return;

      e.preventDefault();

      const container = scrollContainerRef.current;
      if (!container) return;

      // ズーム係数計算
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newScale = Math.min(Math.max(scale + delta, 0.1), 3);

      if (newScale === scale) return;

      // マウス位置を中心にズームするためのスクロール位置調整
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const scrollX = container.scrollLeft;
      const scrollY = container.scrollTop;

      // マウス位置の割合を維持してスクロール位置を計算
      const ratio = newScale / scale;
      const newScrollX = (scrollX + mouseX) * ratio - mouseX;
      const newScrollY = (scrollY + mouseY) * ratio - mouseY;

      setScale(newScale);

      // 次フレームでスクロール位置を更新
      requestAnimationFrame(() => {
        container.scrollLeft = newScrollX;
        container.scrollTop = newScrollY;
      });
    },
    [scale]
  );

  // ドラッグパンハンドラ
  const handlePanMouseDown = useCallback((e: React.MouseEvent) => {
    // 左クリックのみ
    if (e.button !== 0) return;

    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handlePanMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;

      const container = scrollContainerRef.current;
      if (!container) return;

      const dx = panStart.x - e.clientX;
      const dy = panStart.y - e.clientY;

      container.scrollLeft += dx;
      container.scrollTop += dy;

      setPanStart({ x: e.clientX, y: e.clientY });
    },
    [isPanning, panStart]
  );

  const handlePanMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // containerRef が準備できたらフラグを立てる
  useEffect(() => {
    if (containerRef.current) {
      setIsContainerReady(true);
    }
  }, []);

  // wheelイベント登録（passive: false でpreventDefaultを有効化）
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Mermaid図をレンダリング
  useEffect(() => {
    if (!mermaidCode || !containerRef.current || !isContainerReady) return;

    const renderDiagram = async () => {
      setIsRendering(true);
      setError(null);

      try {
        // 一意のIDを生成
        const id = `mermaid-${Date.now()}`;

        // コンテナをクリア
        containerRef.current!.innerHTML = '';

        // Mermaidでレンダリング
        const { svg } = await mermaid.render(id, mermaidCode);

        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
          // レンダリング完了後、SVG要素にdata属性を付与（renderedCallsを使用）
          attachCallEntryIds(containerRef.current, renderedCalls);
        }
      } catch (err) {
        console.error('Mermaid render error:', err);
        setError(err instanceof Error ? err.message : 'レンダリングに失敗しました');
      } finally {
        setIsRendering(false);
      }
    };

    renderDiagram();
  }, [mermaidCode, isContainerReady, renderedCalls]);

  // root関数変更時に選択をクリア
  useEffect(() => {
    setSelectedCallIds(new Set());
  }, [rootFunctionId]);

  // ホバー時のハイライト適用
  // NOTE: isRenderingを依存配列に含めることで、レンダリング完了後にハイライトが再適用される
  // （mermaid.renderは非同期のため、attachCallEntryIds完了前にこのuseEffectが実行されることを防ぐ）
  useEffect(() => {
    if (!containerRef.current || isRendering) return;
    applyHighlight(containerRef.current, hoverTarget, renderedCalls);
  }, [hoverTarget, renderedCalls, isRendering]);

  // ホバー変更ハンドラ
  const handleHoverChange = useCallback((target: HoverTarget) => {
    setHoverTarget(target);
  }, []);

  // ============================================
  // 選択ハンドラ
  // ============================================

  const handleToggleSelection = useCallback(
    (callEntryId: CallEntryId) => {
      const newSelected = new Set(selectedCallIds);
      if (newSelected.has(callEntryId)) {
        newSelected.delete(callEntryId);
      } else {
        newSelected.add(callEntryId);
      }
      setSelectedCallIds(newSelected);
    },
    [selectedCallIds]
  );

  const handleSelectRange = useCallback(
    (startIndex: number, endIndex: number) => {
      const newSelected = new Set(selectedCallIds);
      const start = Math.min(startIndex, endIndex);
      const end = Math.max(startIndex, endIndex);
      for (let i = start; i <= end; i++) {
        newSelected.add(generateCallEntryId(calls[i]));
      }
      setSelectedCallIds(newSelected);
    },
    [calls, selectedCallIds]
  );

  const handleClearSelection = useCallback(() => {
    setSelectedCallIds(new Set());
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedCallIds.size === calls.length) {
      setSelectedCallIds(new Set());
    } else {
      const allIds = calls.map((c) => generateCallEntryId(c));
      setSelectedCallIds(new Set(allIds));
    }
  }, [calls, selectedCallIds]);

  // ============================================
  // グループ操作ハンドラ
  // ============================================

  const handleOpenGroupCreate = useCallback(() => {
    setGroupDialog({ isOpen: true, mode: 'create' });
  }, []);

  const handleOpenGroupEdit = useCallback(
    (groupId: string) => {
      const group = editState.groups.find((g) => g.id === groupId);
      if (group) {
        setGroupDialog({
          isOpen: true,
          mode: 'edit',
          groupId,
          currentName: group.name,
        });
      }
    },
    [editState.groups]
  );

  const handleGroupConfirm = useCallback(
    (name: string) => {
      if (groupDialog.mode === 'create') {
        onAddGroup(name, Array.from(selectedCallIds));
        setSelectedCallIds(new Set());
      } else if (groupDialog.groupId) {
        onUpdateGroup(groupDialog.groupId, { name });
      }
      setGroupDialog({ isOpen: false, mode: 'create' });
    },
    [groupDialog, selectedCallIds, onAddGroup, onUpdateGroup]
  );

  const handleGroupCancel = useCallback(() => {
    setGroupDialog({ isOpen: false, mode: 'create' });
  }, []);

  // ============================================
  // 省略操作ハンドラ
  // ============================================

  const handleAddOmission = useCallback(() => {
    // calls の順序でソートされた配列を作成
    const sortedIds = calls
      .map((c) => generateCallEntryId(c))
      .filter((id) => selectedCallIds.has(id));

    onAddOmission(sortedIds);
    setSelectedCallIds(new Set());
  }, [calls, selectedCallIds, onAddOmission]);

  // ============================================
  // ラベル編集ハンドラ
  // ============================================

  const handleOpenLabelEdit = useCallback(
    (callEntryId: CallEntryId) => {
      const call = calls.find((c) => generateCallEntryId(c) === callEntryId);
      if (!call) return;

      const labelEdit = editState.labelEdits.find((le) => le.callEntryId === callEntryId);
      const originalLabel = extractMethodName(call.to);
      const currentLabel = labelEdit?.customLabel || originalLabel;

      setLabelDialog({
        isOpen: true,
        callEntryId,
        originalLabel,
        currentLabel,
      });
    },
    [calls, editState.labelEdits]
  );

  const handleLabelConfirm = useCallback(
    (label: string) => {
      if (labelDialog) {
        onSetLabelEdit(labelDialog.callEntryId, label);
        setLabelDialog(null);
      }
    },
    [labelDialog, onSetLabelEdit]
  );

  const handleLabelReset = useCallback(() => {
    if (labelDialog) {
      onRemoveLabelEdit(labelDialog.callEntryId);
      setLabelDialog(null);
    }
  }, [labelDialog, onRemoveLabelEdit]);

  const handleLabelCancel = useCallback(() => {
    setLabelDialog(null);
  }, []);

  // ============================================
  // レンダリング
  // ============================================

  // 起点関数が未選択の場合
  if (!rootFunctionId) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <div className="text-center text-gray-500">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
            />
          </svg>
          <p className="text-lg mb-2">シーケンス図がありません</p>
          <p className="text-sm">
            グラフビューで関数を選択し、「シーケンス図表示」ボタンをクリックしてください
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gray-900">
      {/* サイドバー: 設定と編集 */}
      <div className="w-80 flex-shrink-0 border-r border-gray-700 overflow-y-auto flex flex-col">
        <div className="p-4 space-y-4 flex-1">
          {/* ツールバー */}
          <SequenceToolbar
            mermaidCode={mermaidCode}
            hasUnsavedChanges={hasUnsavedChanges}
            onSave={() => setIsSaveDialogOpen(true)}
            onOpen={() => setIsOpenDialogOpen(true)}
            hasSavedSequences={savedSequences.length > 0}
          />

          {/* ズームコントロール */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleZoomOut}
              className="w-8 h-8 bg-gray-700 text-gray-100 border border-gray-600 rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="ズームアウト"
              title="ズームアウト"
            >
              -
            </button>
            <div className="flex items-center">
              <input
                type="number"
                value={Math.round(scale * 100)}
                onChange={handleZoomChange}
                min={10}
                max={300}
                step={10}
                className="w-12 h-8 text-xs text-gray-100 text-center bg-gray-800 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                aria-label="ズーム倍率"
              />
              <span className="text-xs text-gray-400 ml-0.5">%</span>
            </div>
            <button
              onClick={handleZoomIn}
              className="w-8 h-8 bg-gray-700 text-gray-100 border border-gray-600 rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="ズームイン"
              title="ズームイン"
            >
              +
            </button>
            <button
              onClick={handleZoomReset}
              className="px-2 h-8 bg-gray-700 text-gray-100 border border-gray-600 rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              aria-label="リセット"
              title="リセット"
            >
              リセット
            </button>
          </div>

          {/* 起点関数 */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">起点:</label>
            <div className="px-3 py-2 bg-gray-800 rounded border border-gray-700 text-sm text-blue-400 font-mono truncate">
              {extractDisplayName(rootFunctionId)}
            </div>
          </div>

          {/* アクティベーション設定 */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useActivation}
                onChange={onToggleActivation}
                className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900"
              />
              <span className="text-sm text-gray-400">戻り矢印を表示</span>
            </label>
          </div>

          {/* 関数ごとの深さ設定 */}
          {functionDepths.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm text-gray-400">関数の深さ設定:</label>
              <DepthControl
                functionDepths={functionDepths}
                onDepthChange={onFunctionDepthChange}
                onHoverChange={handleHoverChange}
              />
            </div>
          )}

          {/* 区切り線 */}
          <div className="border-t border-gray-700 pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">呼び出し一覧</span>
              <button
                onClick={handleSelectAll}
                className="text-xs text-gray-500 hover:text-gray-300"
              >
                {selectedCallIds.size === calls.length ? '全解除' : '全選択'}
              </button>
            </div>

            {/* 呼び出し一覧 */}
            <CallList
              calls={calls}
              editState={editState}
              selectedCallIds={selectedCallIds}
              onToggleSelection={handleToggleSelection}
              onSelectRange={handleSelectRange}
              onClearSelection={handleClearSelection}
              onEditLabel={handleOpenLabelEdit}
              onHoverChange={handleHoverChange}
            />
          </div>

          {/* アクションパネル（常に表示） */}
          <EditActionsPanel
            selectedCallIds={selectedCallIds}
            calls={calls}
            editState={editState}
            onCreateGroup={handleOpenGroupCreate}
            onOmit={handleAddOmission}
            onClearSelection={handleClearSelection}
          />

          {/* グループ一覧 */}
          <GroupList
            groups={editState.groups}
            onToggleCollapse={onToggleGroupCollapse}
            onEdit={handleOpenGroupEdit}
            onDelete={onRemoveGroup}
          />

          {/* 編集クリアボタン */}
          {(editState.groups.length > 0 ||
            editState.omissions.length > 0 ||
            editState.labelEdits.length > 0) && (
            <div className="border-t border-gray-700 pt-4">
              <button
                onClick={onClearEdits}
                className="w-full px-3 py-2 text-sm text-red-400 border border-red-800 rounded hover:bg-red-900/30"
              >
                編集をすべてクリア
              </button>
            </div>
          )}
        </div>
      </div>

      {/* メインエリア: 図の表示 */}
      <div
        ref={scrollContainerRef}
        className={`flex-1 overflow-auto p-4 relative ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handlePanMouseDown}
        onMouseMove={handlePanMouseMove}
        onMouseUp={handlePanMouseUp}
        onMouseLeave={handlePanMouseUp}
      >
        {isRendering && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
            <div className="text-gray-500">レンダリング中...</div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-red-400">
              <p className="mb-2">レンダリングエラー</p>
              <p className="text-sm text-gray-500">{error}</p>
            </div>
          </div>
        )}

        {!error && (
          <div
            ref={containerRef}
            className="flex justify-center items-start min-h-full"
            style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
          />
        )}
      </div>

      {/* グループダイアログ */}
      <GroupDialog
        isOpen={groupDialog.isOpen}
        mode={groupDialog.mode}
        currentName={groupDialog.currentName}
        onConfirm={handleGroupConfirm}
        onCancel={handleGroupCancel}
      />

      {/* ラベル編集ダイアログ */}
      {labelDialog && (
        <LabelEditDialog
          isOpen={labelDialog.isOpen}
          originalLabel={labelDialog.originalLabel}
          currentLabel={labelDialog.currentLabel}
          onConfirm={handleLabelConfirm}
          onCancel={handleLabelCancel}
          onReset={handleLabelReset}
        />
      )}

      {/* 保存ダイアログ */}
      <SaveDialog
        isOpen={isSaveDialogOpen}
        existingSaves={savedSequences.filter(s => s.rootFunctionId === rootFunctionId)}
        onConfirm={(name, existingId) => {
          onSaveWithName(name, existingId);
          setIsSaveDialogOpen(false);
        }}
        onCancel={() => setIsSaveDialogOpen(false)}
      />

      {/* 開くダイアログ */}
      <OpenDialog
        isOpen={isOpenDialogOpen}
        savedSequences={savedSequences}
        onSelect={(saved) => {
          onOpenSaved(saved);
          setIsOpenDialogOpen(false);
        }}
        onDelete={onDeleteSaved}
        onCancel={() => setIsOpenDialogOpen(false)}
      />
    </div>
  );
}
