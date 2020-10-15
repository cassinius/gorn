import { Entity } from "./entity";
import { Uuid } from "../../types/baseTypes";
import { createQuery, getQuery, updateQuery, deleteQuery, upsertQuery } from "../queries/entityQ";
import { errLog, errSig } from "../../helpers/error";

/**
 * Nodes and edges have basic (and identical) CRUD functionality
 */
export class BaseDoc extends Entity {

  //------------------------------------------------------------
  //                 CREATE / UPDATE / DELETE
  //------------------------------------------------------------

  /**
   * 
   * @param data 
   */
  static async create<D extends {}, T extends BaseDoc = BaseDoc>(data: D): Promise<T> {
    await this.ready();
    const query = createQuery(this._coll, data);
    const newItems: BaseDoc[] = await this.execQuery(query);
    if (newItems == null || newItems[0] == null) {
      return null;
    }
    return this.fromArangoStruct(newItems[0]) as T;
  }

  /**
   * 
   * @param data 
   */
  static async upsert<D extends {}, T extends BaseDoc = BaseDoc>(data: D): Promise<T> {
    await this.ready();
    const query = upsertQuery(this._coll, data, this.UNIQUE_ATT);
    const newItems: BaseDoc[] = await this.execQuery(query);
    if (newItems == null || newItems[0] == null) {
      return null;
    }
    return this.fromArangoStruct(newItems[0]) as T;
  }

  /**
   * 
   * @param uuid 
   * @param newData 
   */
  static async update<T extends BaseDoc, D extends {}>(uuid: Uuid, newData: D): Promise<T> {
    // if ( !newData || Object.keys(newData).length === 0 ) {
    //   throw new Error("newData must be valid object");
    // }
    await this.ready();
    const query = updateQuery(this._coll, uuid, newData);
    const newItems = await this.execQuery(query);
    if (newItems == null || newItems[0] == null) {
      return null;
    }
    return this.fromArangoStruct(newItems[0]) as T;
  }

  /**
   * 
   * @param uuid 
   */
  static async delete<T extends BaseDoc, D extends {}>(uuid: Uuid): Promise<Uuid> {
    await this.ready();
    const checkQuery = getQuery(this._coll, [uuid], 1);
    const items: any[] = await this.execQuery(checkQuery);
    if (!items[0]) {
      return null;
    }
    const delQuery = deleteQuery(this._coll, uuid);
    const deletedKey = await this.execQuery(delQuery).catch(errLog);
    return deletedKey[0];
  }

}