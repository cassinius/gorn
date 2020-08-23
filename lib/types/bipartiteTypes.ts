/**
 * @property  {string}  other - Node type making up the other half of the bipartite sub-graph
 * @property  {string} via - Edge type to traverse (inducing the bi-partite sub-graph)
 */
export interface PeerViaEntry {
  other: string;
  via: string;
}

type OtherViaEdge = { [node: string]: string };
export type ViaStruct = { [node: string]: OtherViaEdge };

interface BipParams {
  must?: boolean;
  dist?: number;
}

export interface BipGetParams extends BipParams {
  uuids: string[];
}

export interface BipFindParams extends BipParams {
  search: string;
  boost?: string;
}

export type BipGetOtherCfg = BipGetParams & { edges: string };
export type BipGetPeerCfg = BipGetParams & { via: string };
export type BipFindOtherCfg = BipFindParams & { edges: string };
export type BipFindPeerCfg = BipFindParams & { via: string };

/**
 * The config object to initialize a Bipartite Mixin's functionality
 */
export interface BipartiteConfig {
  view: string;
  conns: PeerViaEntry[];
}
