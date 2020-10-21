import { EdgeCollection } from 'arangojs/collection';
import { BaseDoc } from "./basedoc";
import { CollType } from '../../types/arangoTypes';
import { EdgeEntity } from './entity';
import { byNodesQuery } from '../queries/edgeQ';

/**
 * 
 */
export class ArangoEdge extends BaseDoc {
  public static _type = CollType.EDGE;
  protected static _coll: EdgeCollection;

  static async byNodes<T extends EdgeEntity>(from: string, to: string): Promise<T> {
    await this.ready();
    const query = byNodesQuery(this._coll, from, to);
    const items = await this.execQuery(query);
    if (items == null || items[0] == null) {
      return null;
    }
    return items[0] ? (this.fromArangoStruct(items[0]) as T) : null;
  }
}
