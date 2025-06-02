
declare module 'd3-sankey' {
  export interface SankeyNode<N = {}, L = {}> {
    x0?: number;
    x1?: number;
    y0?: number;
    y1?: number;
    value?: number;
    sourceLinks?: SankeyLink<N, L>[];
    targetLinks?: SankeyLink<N, L>[];
    [key: string]: any;
  }

  export interface SankeyLink<N = {}, L = {}> {
    source: number | SankeyNode<N, L>;
    target: number | SankeyNode<N, L>;
    value: number;
    width?: number;
    y0?: number;
    y1?: number;
    [key: string]: any;
  }

  export interface SankeyLayout<N = {}, L = {}> {
    (graph: { nodes: N[]; links: L[] }): {
      nodes: SankeyNode<N, L>[];
      links: SankeyLink<N, L>[];
    };
    nodeWidth(): number;
    nodeWidth(width: number): this;
    nodePadding(): number;
    nodePadding(padding: number): this;
    extent(): [[number, number], [number, number]];
    extent(extent: [[number, number], [number, number]]): this;
    size(): [number, number];
    size(size: [number, number]): this;
    iterations(): number;
    iterations(iterations: number): this;
  }

  export function sankey<N = {}, L = {}>(): SankeyLayout<N, L>;

  export function sankeyLinkHorizontal(): any;
}
