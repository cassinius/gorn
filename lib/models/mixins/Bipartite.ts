import { plainToClass } from "class-transformer";
import { ArangoNode } from "../base";
import { getPeerQuery, findPeerQuery, getOtherQuery, findOtherQuery } from "../queries/bipartiteQ";
import { BaseEntity } from "../../types/baseTypes";
import { HasOtherStruct, PeerStruct } from "../../types/queryTypes";
/**
 * @todo refactor, who needs that many Cfgs...?
 */
import {
  BipartiteConfig,
  BipGetOtherCfg,
  BipGetPeerCfg,
  BipFindOtherCfg,
  BipFindPeerCfg,
  ViaStruct,
} from "../../types/bipartiteTypes";

/**
 * Global traversal struct holding bipartite information
 * for *every* bipartite subgraph in the application graph
 *
 * @todo this is very unelegant
 *       -> refactor out into global *app*-specific config struct??
 *       -> together with the *db struct* ...
 */
const viaStruct: ViaStruct = {};

/**
 * @todo generalize Jobs4Skills - OR - derive type from caller
 */
export abstract class BipartiteNode extends ArangoNode {
  static async getOther(cfg: BipGetOtherCfg): Promise<BaseEntity[]> {
    return null;
  }

  static async getPeers(cfg: BipGetPeerCfg): Promise<PeerStruct> {
    return null;
  }

  static async findOther(cfg: BipFindOtherCfg): Promise<HasOtherStruct> {
    return null;
  }

  static async findPeers(cfg: BipFindPeerCfg): Promise<PeerStruct> {
    return null;
  }
}

/**
 * @todo instantiate DBStruct somewhere here before populating
 *       structs with ArangoDB objects mapped from
 */
export function Bipartite<T extends typeof ArangoNode>(
  config: BipartiteConfig,
  Base: T
): T & typeof BipartiteNode {
  type NewType = typeof Base & typeof ArangoNode;

  /**
   * Add traversal info to viaStruct
   */
  if (viaStruct[Base.Class] == null) {
    viaStruct[Base.Class] = {};
  }
  config.conns.forEach(conn => {
    if (viaStruct[Base.Class][conn.other] == null) {
      viaStruct[Base.Class][conn.other] = conn.via;
    }
  });
  // console.debug('VIA STRUCT: ', viaStruct);

  return class extends (Base as NewType) implements BipartiteNode {
    /**
     * @description returns the raw result
     * @param uuids
     * @param dist {number} the number of traversal steps to
     *             ONE specfic side of the bi-partite graph
     * - actual dist will be: 2 * dist - 1
     */
    static async getOther(cfg: BipGetOtherCfg): Promise<BaseEntity[]> {
      await this.ready();

      const dist = cfg.dist ?? 1;
      const must = cfg.must ?? true;
      const query = getOtherQuery(this._coll, cfg.edges, cfg.uuids, 2 * dist - 1);
      const others: unknown[] = await this.execQuery(query);
      return plainToClass(BaseEntity, others);
    }

    /**
     *
     * @param cfg
     */
    static async getPeers(cfg: BipGetPeerCfg): Promise<PeerStruct> {
      await this.ready();

      const dist = cfg.dist ?? 1;
      const must = cfg.must ?? true;
      const via = viaStruct[this.Class][cfg.via];

      if (via == null) {
        throw "Could not find edge type to traverse.";
      }

      const query = getPeerQuery(this._coll, via, cfg.uuids, this.RETATT, 2 * dist);
      // console.debug(query);

      const peers: any[] = await this.execQuery(query);
      return peers.map(ps => ({
        edges: ps.edges,
        path: ps.path,
      }));
    }

    /**
     * Returns jobs for which this skill is essential / optional
     *
     * @todo this is part of a Bi-Partite relation / sub-graph
     *       -> here we want to get entities of the 'other' group
     */
    static async findOther(cfg: BipFindOtherCfg): Promise<HasOtherStruct> {
      const query = await findOtherQuery(this.VIEW, this.ATTRS, cfg.edges, cfg.search, this.RETATT);
      const otherStruct = await this.execQuery(query);
      return otherStruct.map(ho => ({
        source: ho.source,
        targets: ho.targets,
      }));
    }

    /**
     * Peers -> the `self`-group in a bi-partite relation
     */
    static async findPeers(cfg: BipFindPeerCfg): Promise<PeerStruct> {
      const via = viaStruct[this.Class][cfg.via];
      if (!via) {
        throw "Could not find existing edge type to traverse.";
      }
      const query = await findPeerQuery(this.VIEW, this.ATTRS, via, cfg.search, this.RETATT);
      // console.debug(query);

      const peerJobs = await this.execQuery(query);
      return peerJobs.map(ps => ({
        edges: ps.edges,
        path: ps.path,
      }));
    }
  };
}
