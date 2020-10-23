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

  /**
   * @todo test !!
   */
  static async uniqueIndex(): Promise<boolean> {
    const idxs = await this.getIndexes();
    const fromTo = idxs.find(idx => idx.fields[0] === '_from' && idx.fields[1] === '_to');
    return fromTo.unique;
  }

  /**
   * @todo test !!
   */
  static async byNodes<T extends EdgeEntity>(from: string, to: string): Promise<T> {
    await this.ready();
    const query = byNodesQuery(this._coll, from, to);
    const items = await this.execQuery(query);    
    return items && items[0] ? (this.fromArangoStruct(items[0]) as T) : null;
  }
}
