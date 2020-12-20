import { ArangoSearchView } from "arangojs/view";
import { Entity } from "./entity";
import { ArangoDoc, Uuid } from "../../types/baseTypes";
import {
  getQuery,
  byFieldQuery,
  findQuery,
  createQuery,
  updateQuery,
  deleteQuery,
  upsertQuery,
  allQuery,
  forceViewQuery,
} from "../queries/baseDocQ";
import { errLog, errSig } from "../../helpers/error";
import { Nodege } from "../../types";
import { getDBStruct } from "../../db";

/**
 * Nodes and edges have basic (and identical) CRUD functionality
 */
export class BaseDoc extends Entity {
  protected _features: {};

  //=====================================================
  //=         POLYMORPHIC (STATIC) ATTRIBUTES
  //=====================================================

  /**
   * @description which search view to query against
   * @example in ArangoDB, this is an `ArangoSearchView` handle
   */
  protected static _searchView: ArangoSearchView;

  /**
   * @description a string representation of the DB Search View
   * @example in ArangoDB, this gets translated to an `ArangoSearchView` handle
   */
  protected static _view: string;

  /**
   * @description the attribute which identifies a document
   * @example `title` , `preferredLabel`, etc.
   */
  protected static _labelField: string;

  /**
   * @description the attributes to query against in a `search` operation
   */
  protected static _searchAttr: string[];

  /**
   * @description attributes to pick in case we don't return the whole object
   */
  protected static _pickAttrs: string[];

  /**
   * @description attributes by which an object is identified as unique during `upsert`
   */
  protected static _uniqueAttrs: string[];

  //=====================================================
  //=              GETTERS AND SETTERS
  //=====================================================

  public get features(): any {
    return this._features;
  }

  public set features(f) {
    this._features = f;
  }

  /**
   * This is only here in order to search for
   * and set a valid ArangoSearch view at runtime
   * @example 'skillsView', 'jobsView', etc.
   */
  public static get viewStr(): string {
    return this._view;
  }

  /**
   * The actual ArangoSearchView
   *
   * @description anything that has features must be searchable...
   */
  public static get VIEW(): ArangoSearchView {
    return this._searchView;
  }

  /**
   * Returns fields to search in (ArangoSearch / FT etc.)
   */
  public static get SEARCH_FLD(): string[] {
    return this._searchAttr;
  }

  /**
   * Returns the model's label field
   * @example 'title', 'preferredLabel', etc.
   */
  public static get LABEL_FLD(): string {
    return this._labelField;
  }

  /**
   * Returns an array of properties to collect in query results
   * @example ['title', 'concepts'] or ['preferredLabel', 'altLabels']
   */
  public static get PICK_ATT(): string[] {
    return this._pickAttrs;
  }

  /**
   * Returns an array of properties to check uniqueness against in `upsert` operations
   */
  public static get UNIQUE_ATT(): string[] {
    return this._uniqueAttrs;
  }

  //=====================================================
  //=                     INFO
  //=====================================================

  static async getIndexes() {
    await this.ready();
    return await this._db.conn.collection(this.Class).indexes();
  }

  //=====================================================
  //=                    BASICS
  //=====================================================

  static async count(): Promise<number> {
    await this.ready();
    return await (await this._coll.count()).count;
  }

  /**
   * @todo test HARD LIMIT
   */
  static async all<T extends BaseDoc>(): Promise<T[]> {
    await this.ready();
    const results = await this.execQuery(allQuery(this._coll));
    return results.map((res) => this.fromArangoStruct(res));
  }

  /**
   *
   */
  static async forceViewSync(): Promise<void> {
    await this.ready();
    await this.execQuery(forceViewQuery(this.VIEW));
    return null;
  }

  //=====================================================
  //=                   GET-> BY FIELD
  //=====================================================

  /**
   *
   * @param label
   */
  static async byLabel<T extends BaseDoc>(label: string): Promise<T> {
    return await this.byField(this.LABEL_FLD, label);
  }

  /**
   *
   * @param field
   * @param value
   */
  static async byField<T extends BaseDoc>(
    field: string,
    value: any
  ): Promise<T> {
    await this.ready();
    const query = byFieldQuery(this._coll, field, value);
    const items = await this.execQuery(query);
    if (items == null || items[0] == null) {
      return null;
    }
    return items[0] ? (this.fromArangoStruct(items[0]) as T) : null;
  }

  //=====================================================
  //=                  GET -> BY _ID
  //=====================================================

  /**
   *
   * @param uuid {string}
   */
  static async getOne<T extends BaseDoc>(uuid: string): Promise<T> {
    await this.ready();
    const query = getQuery(this._coll, [uuid], 1);
    const results: any[] = await this.execQuery(query);
    return results[0] ? (this.fromArangoStruct(results[0]) as T) : null;
  }

  /**
   *
   * @param uuids {string[]}
   * @param limit {number}
   */
  static async getMany<T extends BaseDoc>(
    uuids: string[],
    limit: number
  ): Promise<T[]> {
    await this.ready();
    const query = getQuery(this._coll, uuids, limit);
    const results: any[] = await this.execQuery(query);
    return results.map((res) => this.fromArangoStruct(res));
  }

  //=====================================================
  //=                 FIND -> BY SEARCH
  //=====================================================

  /**
   *
   * @param search {string} search string
   */
  static async findOne<T extends BaseDoc>(search: string): Promise<T> {
    await this.ready();
    const query = findQuery(this.VIEW, this.SEARCH_FLD, search, 1);

    // console.debug(query);

    const items = await this.execQuery(query);

    // console.debug(items);

    return items[0] ? (this.fromArangoStruct(items[0]) as T) : null;
  }

  /**
   *
   * @param search {string} search string
   * @param limit {number} result lenth limit
   */
  static async findMany<T extends BaseDoc>(
    search: string,
    limit: number
  ): Promise<T[]> {
    await this.ready();
    const query = findQuery(this.VIEW, this.SEARCH_FLD, search, limit);
    const results: any[] = await this.execQuery(query);
    return results.map((res) => this.fromArangoStruct(res));
  }

  //=====================================================
  //=             CREATE / UPDATE / DELETE
  //=====================================================

  /**
   *
   * @param data
   */
  static async create<D extends {}, T extends BaseDoc = BaseDoc>(
    data: D
  ): Promise<T> {
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
  static async upsert<D extends {}, T extends BaseDoc = BaseDoc>(
    data: D
  ): Promise<T> {
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
  static async update<T extends BaseDoc, D extends {}>(
    uuid: Uuid,
    newData: D
  ): Promise<T> {
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
  static async delete<T extends BaseDoc, D extends {}>(
    uuid: Uuid
  ): Promise<Uuid> {
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
    await ne
      .truncate()
      .catch((e: Error) =>
        console.log(
          `Truncating collection ${this._class} failed... \n`,
          e.message
        )
      );
  }

  /**
   *
   */
  static async dropCollection() {
    // throw new Error("Hyperedge->delete() not implemented yet.");
    const ne: Nodege = this._db.conn.collection(this._class);
    await ne
      .drop()
      .catch((e: Error) =>
        console.log(`Dropping collection ${this._class} failed... `, e.message)
      );
  }

  //=====================================================
  //=                JUST ENGINEERING...
  //=====================================================

  /**
   * The <T> allows us to at least correctly
   * interpret the result from the outside..
   */
  toJson<T = Entity>(): T {
    return this.features as T;
  }

  /**
   * We include the (uuid) key in our internal
   * entity representation or consumption by the API
   *
   * @todo do we need the generics? it seems the `new this()`
   *       determines the return value anyways, when called
   *       via `this.fromArangoStruct`..
   */
  static fromArangoStruct<T extends BaseDoc>(ae: ArangoDoc): T {
    const entity = new this() as T;
    const { _id, _rev, _from, _to, ...restOfFeatures } = ae;
    entity._id = _id;
    entity._rev = _rev;
    entity._key = ae._key;
    entity._from = _from;
    entity._to = _to;
    entity._features = restOfFeatures;
    return entity;
  }

  /**
   * Overwrites the `ready` method in `Entity`
   * additionally sets the correct search view
   *
   * @todo this._db should be the instantiated & valid db struct
   *       for whatever application...
   */
  static async ready() {
    this._db = await getDBStruct(this.DB);
    // set the search view for 'this'
    this._searchView = this._db.views[this.viewStr];
    // set the DB collection for 'this'
    if (!this._coll && this.Type && this.Class) {
      this._coll = this._db[this.Type][this.Class];
    }
  }

  //=====================================================
  //=                    FILTERS
  //=====================================================

  /**
   * Export selected BaseDoc[] to CSV string
   *
   * @description
   *
   * @todo typing...
   */
  // static async toCsv<T extends BaseDoc>(
  //   docs: T[],
  //   fields: string[]
  // ): Promise<string> {
  //   const allDocs = await this._all();
  //   console.log(allDocs[0]);

  //   const csvStr = "";

  //   return csvStr;
  // }

  //=====================================================
  //=                    HELPERS
  //=====================================================

  /**
   * REALLY returns ALL entries
   *
   * @todo test
   */
  private static async _all(): Promise<BaseDoc[]> {
    await this.ready();
    const query = allQuery(this._coll, Number.POSITIVE_INFINITY);
    return await this.execQuery(query);
  }
}
