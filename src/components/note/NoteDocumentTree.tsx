/**
 * NoteDocumentTree.tsx
 *
 * ドキュメントをカテゴリ別にツリー表示するコンポーネント
 */

import { useState } from "react";
import type { NoteDocumentCategory, NoteDocumentEntry } from "../../types/note";

interface NoteDocumentTreeProps {
  categories: NoteDocumentCategory[];
  selectedId: string | null;
  onSelect: (entry: NoteDocumentEntry) => void;
}

export function NoteDocumentTree({
  categories,
  selectedId,
  onSelect,
}: NoteDocumentTreeProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(categories.map((c) => c.id))
  );

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  if (categories.length === 0) {
    return (
      <div className="p-4 text-gray-500 text-sm">ドキュメントがありません</div>
    );
  }

  return (
    <div className="flex flex-col">
      {categories.map((category) => (
        <div key={category.id}>
          <button
            onClick={() => toggleCategory(category.id)}
            className="w-full text-left px-4 py-2 bg-gray-800 hover:bg-gray-750 flex items-center gap-2"
          >
            <span
              className={`transition-transform ${
                expandedCategories.has(category.id) ? "rotate-90" : ""
              }`}
            >
              ▶
            </span>
            <span className="font-medium text-gray-300">{category.name}</span>
            <span className="text-xs text-gray-500 ml-auto">
              {category.items.length}
            </span>
          </button>
          {expandedCategories.has(category.id) && (
            <div className="bg-gray-850">
              {category.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelect(item)}
                  className={`w-full text-left pl-8 pr-4 py-2 border-b border-gray-700 hover:bg-gray-800 transition-colors ${
                    selectedId === item.id
                      ? "bg-gray-800 border-l-2 border-l-blue-500"
                      : ""
                  }`}
                >
                  <div className="text-sm text-gray-200">{item.title}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
