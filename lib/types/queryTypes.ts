import { Uuid, ArangoDoc } from "./baseTypes";

//-----------------------------------------
//           QUERY OUTPUT TYPES
//-----------------------------------------

/**
 * @todo maybe these should be general graph query types...?
 */
export interface PeerStructEntry {
  edges: {
    from: Uuid[];
    to: Uuid[];
  };
  path: {
    uuids: Uuid[];
    labels: string[];
  };
}

export type PeerStruct = PeerStructEntry[];

export interface HasOtherEntry {
  source: ArangoDoc;
  targets: ArangoDoc[];
}

export type HasOtherStruct = HasOtherEntry[];
