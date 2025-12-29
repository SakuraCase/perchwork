import React from 'react';

/**
 * Loading コンポーネント
 *
 * ローディング状態を視覚的に表示するスピナーコンポーネント。
 * サイズとメッセージをカスタマイズ可能。
 */

interface LoadingProps {
  /** ローディング中に表示するメッセージ */
  message?: string;
  /** スピナーのサイズ */
  size?: 'small' | 'medium' | 'large';
}

/**
 * スピナーのサイズに応じたCSSクラスを返す
 * @param size - スピナーのサイズ
 * @returns Tailwind CSSクラス文字列
 */
const getSpinnerSize = (size: 'small' | 'medium' | 'large'): string => {
  switch (size) {
    case 'small':
      return 'w-8 h-8';
    case 'medium':
      return 'w-12 h-12';
    case 'large':
      return 'w-16 h-16';
    default:
      return 'w-12 h-12';
  }
};

/**
 * テキストサイズに応じたCSSクラスを返す
 * @param size - スピナーのサイズ
 * @returns Tailwind CSSクラス文字列
 */
const getTextSize = (size: 'small' | 'medium' | 'large'): string => {
  switch (size) {
    case 'small':
      return 'text-sm';
    case 'medium':
      return 'text-base';
    case 'large':
      return 'text-lg';
    default:
      return 'text-base';
  }
};

/**
 * Loadingコンポーネント
 *
 * アニメーション付きスピナーとメッセージを表示。
 * データ読み込み中やAPI通信中の待機状態を示すために使用。
 */
export const Loading: React.FC<LoadingProps> = ({
  message = '読み込み中...',
  size = 'medium'
}) => {
  const spinnerSizeClass = getSpinnerSize(size);
  const textSizeClass = getTextSize(size);

  return (
    <div className="flex flex-col items-center justify-center p-8">
      {/* スピナー */}
      <div
        className={`${spinnerSizeClass} border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin`}
        role="status"
        aria-label="読み込み中"
      />
      {/* メッセージ */}
      <p className={`mt-4 text-gray-300 ${textSizeClass}`}>
        {message}
      </p>
    </div>
  );
};
