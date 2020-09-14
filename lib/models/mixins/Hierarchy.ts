import { ArangoNode } from "../base/node";
import { getSubSuperQuery, getSiblingsQuery, findSubSuperQuery } from "../queries/hierarchyQ";


export interface HierarchyConfig {
  view: string;
  edges: string;
}


export abstract class HierarchyNode extends ArangoNode {
  static async getSiblings<T extends ArangoNode>(
    uuids: string[],
    levels: number = 1
  ): Promise<T[]> {
    return null;
  }

  static async getSubs<T extends ArangoNode>(
    uuids: string[],
    close?: number,
    far?: number
  ): Promise<T[]> {
    return null;
  }

  static async getSupers<T extends ArangoNode>(
    uuids: string[],
    close?: number,
    far?: number
  ): Promise<T[]> {
    return null;
  }

  static async findSubs<T extends ArangoNode>(
    search: string,
    close?: number,
    far?: number
  ): Promise<T[]> {
    return null;
  }

  static async findSupers<T extends ArangoNode>(
    search: string,
    close?: number,
    far?: number
  ): Promise<T[]> {
    return null;
  }
}

/**
 * Generic type Constructable is probably just needed if we dont
 * want to make any assumptions about what SuperClass functionality
 * should already be present in the Class to mix behavior into...
 */
// type Constructable<T = {}> = new (...args: any[]) => T;
export function Hierarchy<T extends typeof ArangoNode>(
  config: HierarchyConfig,
  Base: T
): T & typeof HierarchyNode {
  type NewType = typeof Base & typeof ArangoNode;
  return class extends (Base as NewType) implements HierarchyNode {
    /**
     * GET sibling skills (via hierarchy) by uuid
     * @todo right now we ignore the level, since
     *       even l=1 can yield > 100 results...
     */
    static async getSiblings<T extends ArangoNode>(
      uuids: string[],
      levels: number = 1
    ): Promise<T[]> {
      await this.ready();
      const query = getSiblingsQuery(this._coll, config.edges, uuids, levels);
      const siblings: any[] = await this.execQuery(query);
      return siblings.map(s => this.fromArangoStruct(s));
    }

    /**
     *
     * @param uuids
     * @param close
     * @param far
     */
    static async getSubs<T extends ArangoNode>(
      uuids: string[],
      close: number,
      far: number
    ): Promise<T[]> {
      await this.ready();
      const query = getSubSuperQuery(this._coll, config.edges, uuids, close ?? 1, far ?? 1);
      // console.log('SUB query: ', query);
      const results: any[] = await this.execQuery(query);
      return results.map(r => this.fromArangoStruct(r));
    }

    /**
     *
     * @param uuids
     * @param close
     * @param far
     */
    static async getSupers<T extends ArangoNode>(
      uuids: string[],
      close: number,
      far: number
    ): Promise<T[]> {
      await this.ready();
      const query = getSubSuperQuery(this._coll, config.edges, uuids, close ?? 1, far ?? 1, false);
      // console.log('SUPER query: ', query);
      const results: any[] = await this.execQuery(query);
      return results.map(r => this.fromArangoStruct(r));
    }

    /**
     * Returns sub-skills (more specialized) according to the
     * `broaderSkill` relation in Esco
     * @param search
     * @param close
     * @param far
     */
    static async findSubs<T extends ArangoNode>(
      search: string,
      close?: number,
      far?: number
    ): Promise<T[]> {
      await this.ready();
      const query = findSubSuperQuery(this.VIEW, this.SEARCH_FLD, config.edges, search, close ?? 1, far ?? 1);
      const results: any[] = await this.execQuery(query);
      return results.map(res => this.fromArangoStruct(res));
    }

    /**
     * Returns super-skills (more abstract) according to the
     * `broaderSkill` relation in Esco
     * @param search
     * @param close
     * @param far
     */
    static async findSupers<T extends ArangoNode>(
      search: string,
      close?: number,
      far?: number
    ): Promise<T[]> {
      await this.ready();
      const query = findSubSuperQuery(this.VIEW, this.SEARCH_FLD, config.edges, search, close ?? 1, far ?? 1, false);
      const results: any[] = await this.execQuery(query);
      return results.map(res => this.fromArangoStruct(res));
    }
  };
}
