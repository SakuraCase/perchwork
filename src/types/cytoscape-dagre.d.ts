/**
 * cytoscape-dagre 型定義
 *
 * cytoscape-dagre には公式の型定義がないため、
 * 最低限の型定義をここで宣言する
 */

declare module 'cytoscape-dagre' {
  import type { Ext } from 'cytoscape';

  const cytoscapeDagre: Ext;
  export = cytoscapeDagre;
}
