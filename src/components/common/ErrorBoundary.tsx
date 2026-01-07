import React, { Component } from 'react';
import type { ReactNode } from 'react';

/**
 * ErrorBoundary コンポーネント
 *
 * Reactレンダリングエラーをキャッチして表示するエラーバウンダリ。
 * 子コンポーネントでエラーが発生した場合、フォールバックUIを表示する。
 */

interface ErrorBoundaryProps {
  /** レンダリングする子要素 */
  children: ReactNode;
  /** エラー時に表示するカスタムUI（省略時はデフォルトのエラー表示） */
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  /** エラーが発生したかどうか */
  hasError: boolean;
  /** キャッチされたエラーオブジェクト */
  error?: Error;
}

/**
 * ErrorBoundaryコンポーネント
 *
 * React 19のエラーバウンダリAPI（getDerivedStateFromError, componentDidCatch）を使用。
 * エラーをキャッチし、ユーザーフレンドリーなエラー画面を表示する。
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  /**
   * エラー発生時にstateを更新
   * @param error - キャッチされたエラー
   * @returns 更新されたstate
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  /**
   * エラー情報をコンソールに出力
   * @param error - キャッチされたエラー
   * @param errorInfo - エラー発生箇所の情報
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  /**
   * ページをリロードしてエラーから復帰
   */
  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // カスタムfallbackが指定されている場合はそれを表示
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // デフォルトのエラー表示
      return (
        <div className="flex items-center justify-center min-h-screen bg-stone-900 text-stone-100">
          <div className="max-w-md p-8 bg-stone-800 rounded-lg shadow-lg">
            <h1 className="text-2xl font-bold text-red-400 mb-4">
              エラーが発生しました
            </h1>
            <p className="text-stone-300 mb-4">
              アプリケーションでエラーが発生しました。ページを再読み込みしてください。
            </p>
            {this.state.error && (
              <div className="mb-4 p-4 bg-stone-900 rounded border border-stone-700">
                <p className="text-sm text-stone-400 font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <button
              onClick={this.handleReload}
              className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors"
            >
              再読み込み
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
