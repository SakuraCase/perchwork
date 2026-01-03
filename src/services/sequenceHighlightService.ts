/**
 * シーケンス図ハイライトサービス
 *
 * 責務:
 *   - CallInfo配列とMermaid SVG要素間のマッピング
 *   - Mermaid SVG内部構造への依存の集約
 *   - ハイライトCSSクラスの追加/削除
 *
 * マッピング方式:
 *   mermaidGeneratorが生成するラベルに埋め込まれたインデックスマーカー
 *   [[idx:N]] を使用し、DOM順序ベースでマッピングする。
 *   N番目のマーカーはN番目の.messageLine0に対応する。
 */

import type { CallInfo, CallEntryId, HoverTarget } from '../types/sequence';
import { generateCallEntryId } from '../types/sequence';

// ============================================
// Mermaid SVG構造への依存を集約
// ============================================

const SELECTORS = {
  /** 呼び出し矢印（戻り矢印.messageLine1は除外） */
  messageLine: '.messageLine0',
  /** メッセージテキスト */
  messageText: '.messageText',
} as const;

const HIGHLIGHT_CLASSES = {
  arrow: 'sequence-highlight-arrow',
  text: 'sequence-highlight-text',
} as const;

/** インデックスマーカーの正規表現 */
const CALL_INDEX_REGEX = /\[\[idx:(\d+)\]\]/;

// ============================================
// 内部ヘルパー
// ============================================

/**
 * SVGテキスト要素からマーカーを削除
 * tspan子要素がある場合はそれぞれをチェック
 */
function removeMarkerFromText(textEl: Element, marker: string): void {
  // tspanがある場合
  const tspans = textEl.querySelectorAll('tspan');
  if (tspans.length > 0) {
    tspans.forEach((tspan) => {
      if (tspan.textContent?.includes(marker)) {
        tspan.textContent = tspan.textContent.replace(marker, '').trim();
      }
    });
  }
  // 直接テキストノードの場合
  if (textEl.textContent?.includes(marker)) {
    textEl.textContent = textEl.textContent.replace(marker, '').trim();
  }
}

/**
 * 特定の呼び出しをハイライト（複数要素対応）
 */
function highlightCall(container: HTMLElement, callEntryId: CallEntryId): void {
  // 矢印線をすべてハイライト
  container
    .querySelectorAll(`${SELECTORS.messageLine}[data-call-entry-id="${callEntryId}"]`)
    .forEach((el) => el.classList.add(HIGHLIGHT_CLASSES.arrow));

  // テキストをすべてハイライト
  container
    .querySelectorAll(`${SELECTORS.messageText}[data-call-entry-id="${callEntryId}"]`)
    .forEach((el) => el.classList.add(HIGHLIGHT_CLASSES.text));
}

// ============================================
// 公開API
// ============================================

/**
 * CallInfo配列とSVG要素をマッピングしてdata属性を付与
 *
 * DOM順序ベースのマッピング:
 * 1. マーカー[[idx:N]]を含むテキスト要素を見つける
 * 2. N番目の.messageLine0が対応する矢印線
 * 3. 兄弟要素検索で関数名テキストも取得
 *
 * MermaidはMermaidコードの記述順でSVG要素をレンダリングするため、
 * マーカーのインデックスと矢印線のDOM順序は一致する。
 *
 * @param container - SVGを含むコンテナ要素
 * @param calls - 描画された呼び出しリスト（mermaidGeneratorから取得）
 */
export function attachCallEntryIds(
  container: HTMLElement,
  calls: CallInfo[]
): void {
  const texts = Array.from(container.querySelectorAll(SELECTORS.messageText));
  const lines = Array.from(container.querySelectorAll(SELECTORS.messageLine));

  // SVG要素がまだ存在しない場合は何もしない（レンダリング中）
  if (texts.length === 0) {
    return;
  }

  // テキスト要素からインデックスマーカーを抽出してマッピング
  texts.forEach((textEl) => {
    const fullText = textEl.textContent || '';
    const match = fullText.match(CALL_INDEX_REGEX);

    if (!match) return;

    const callIndex = parseInt(match[1], 10);
    const call = calls[callIndex];

    if (!call) return;

    const callEntryId = generateCallEntryId(call);

    // マーカーをDOMから削除（ユーザーには見せない）
    removeMarkerFromText(textEl, match[0]);

    // Step 1: マーカー付きテキストにdata属性を付与
    textEl.setAttribute('data-call-entry-id', callEntryId);

    // Step 2: 対応する矢印線にdata属性を付与（DOM順 = インデックス順）
    const correspondingLine = lines[callIndex];
    if (correspondingLine) {
      correspondingLine.setAttribute('data-call-entry-id', callEntryId);
    }

    // Step 3: 兄弟要素検索で関数名テキストを探す（複数text構造の場合）
    const prevSibling = textEl.previousElementSibling;
    if (
      prevSibling &&
      prevSibling.classList.contains('messageText') &&
      !prevSibling.hasAttribute('data-call-entry-id')
    ) {
      prevSibling.setAttribute('data-call-entry-id', callEntryId);
    }
  });
}

/**
 * 全ハイライトをクリア
 */
export function clearHighlights(container: HTMLElement): void {
  container
    .querySelectorAll(`.${HIGHLIGHT_CLASSES.arrow}`)
    .forEach((el) => el.classList.remove(HIGHLIGHT_CLASSES.arrow));
  container
    .querySelectorAll(`.${HIGHLIGHT_CLASSES.text}`)
    .forEach((el) => el.classList.remove(HIGHLIGHT_CLASSES.text));
}

/**
 * HoverTargetに応じてハイライトを適用
 *
 * @param container - SVGを含むコンテナ要素
 * @param target - ホバー対象（null でクリア）
 * @param calls - 描画された呼び出しリスト
 */
export function applyHighlight(
  container: HTMLElement,
  target: HoverTarget,
  calls: CallInfo[]
): void {
  clearHighlights(container);

  if (!target) return;

  if (target.type === 'call') {
    highlightCall(container, target.callEntryId);
  } else if (target.type === 'function') {
    // 関数に関連する全呼び出しをハイライト
    calls.forEach((call) => {
      if (
        call.from === target.functionId ||
        call.to === target.functionId
      ) {
        highlightCall(container, generateCallEntryId(call));
      }
    });
  }
}
