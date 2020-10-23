import { Entity } from "./entity";
import { Uuid } from "../../types/baseTypes";
import { getQuery } from "../queries/entityQ";
import { createQuery, updateQuery, deleteQuery, upsertQuery } from "../queries/baseDocQ";
import { errLog, errSig } from "../../helpers/error";
import { Nodege } from "../../types";

/**
 * Nodes and edges have basic (and identical) CRUD functionality
 */
export class BaseDoc extends Entity {

  //============================================================
  //=                          INFO
  //============================================================

  static async getIndexes() {
    await this.ready();
    return await this._db.conn.collection(this.Class).indexes();
  }

  //============================================================
  //=                 CREATE / UPDATE / DELETE
  //============================================================

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
    //   throw new Error("newData must be valid, non-empty object");
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

  /**
   *
   */
  static async truncateCollection() {
    // throw new Error("Hyperedge->truncate() not implemented yet.");
    const ne: Nodege = this._db.conn.collection(this._class);
    await ne.truncate().catch((e: Error) => console.log(`Truncating collection ${this._class} failed... \n`, e.message));
  }

  /**
   *
   */
  static async dropCollection() {
    // throw new Error("Hyperedge->delete() not implemented yet.");
    const ne: Nodege = this._db.conn.collection(this._class);
    await ne.drop().catch((e: Error) => console.log(`Dropping collection ${this._class} failed... `, e.message));
  }

}

