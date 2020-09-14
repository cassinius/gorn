import { ArangoNode } from "../base/node";
import { relGetQuery, relFindQuery } from "../queries/relatedQ";

export interface RelatedConfig {
  view: string;
  edges: string;
}

export abstract class RelatedNode extends ArangoNode {
  static async getRelated<T extends ArangoNode>(
    uuids: string[],
    dist: number = 1
  ): Promise<T[]> {
    return null;
  }

  static async findRelated<T extends ArangoNode>(
    search: string,
    dist: number = 1
  ): Promise<T[]> {
    return null;
  }
}

export function Related<T extends typeof ArangoNode>(
  config: RelatedConfig,
  Base: T
): T & typeof RelatedNode {
  type NewType = typeof Base & typeof ArangoNode;

  return class extends (Base as NewType) implements RelatedNode {
    static async getRelated<T extends ArangoNode>(
      uuids: string[],
      dist: number = 1
    ): Promise<T[]> {
      await this.ready();
      const query = relGetQuery(this._coll, config.edges, uuids, dist);
      const related = await this.execQuery(query);
      return related.map(s => this.fromArangoStruct(s));
    }

    /**
     * Returns related skills (according to esco)
     *
     * @todo heterarchical -> distance-aware
     */
    static async findRelated<T extends ArangoNode>(
      search: string,
      dist: number = 1
    ): Promise<T[]> {
      const query = relFindQuery(
        this.VIEW,
        config.edges,
        this.SEARCH_FLD,
        search,
        dist
      );
      const related = await this.execQuery(query);
      return related.map(s => this.fromArangoStruct(s));
    }
  };
}
