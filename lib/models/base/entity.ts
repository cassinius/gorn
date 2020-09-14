import { ArangoSearchView } from "arangojs/view";
import { ArangoDBStruct, CollType, Nodege } from "../../types/arangoTypes";
import { BaseEntity, Uuid } from "../../types/baseTypes";
import { createQuery, getQuery, findQuery, byFieldQuery, allQuery, updateQuery, deleteQuery, forceViewQuery, upsertQuery } from "../queries/entityQ";
import { getDBStruct } from "../../db/instantiateDB";
import { err } from "../../helpers/misc";

/**
 * FOR ALL STATIC METHODS
 *
 * We use `this` to refer to the class object
 * the method was called upon.. e.g. `User` or `Friendship`.
 * 
 * @description Calling `Entity` would result in calling the
 * base-class method or instantiate an object from the
 * base-class, not the dynamic sub-class
 * 
 * @property {string} _view a string representation of the DB Search View
 * @property {ArangoSearchView} _searchView actual search view object / handle
 *
 * @todo this class should only represent `Nodes` and `Edges`
 *       -> specify so via Types
 */
export class Entity implements BaseEntity {
  _id: string;
  _key: string;
  _rev: string;
  _entity: {};

  //------------------------------------------------------------
  //              POLYMORPHIC (STATIC) ATTRIBUTES
  //------------------------------------------------------------
  /**
   * These properties will only be initialized
   * in specific derived classes, since we can
   * not know the particular DB structure
   * in beforehand.
   */
  protected static _db: ArangoDBStruct;

  /**
   * @description the DB unit holding items of `this` type
   */
  protected static _coll: Nodege;

  /**
   * @description type of DB object
   * @example `Node`, `Edge`, `Graph` or `View`
   * @todo `Entity` should only refer to Nodes or Edges,
   *       its functionality does not make sense for others...!!
   */
  protected static _type: CollType;

  /**
   * @description which search view to query against
   * @example in ArangoDB, this is an `ArangoSearchView` handle
   */
  protected static _searchView: ArangoSearchView;

  /**
   * @todo ideally the following properties should all be type constrained,
   *       - but in a flexible way
   *       - which means we'd need polymorphic enums !?
   *       - e.g. "must be member of an 'Attr' enum or such.."
   */
  protected static _class: string;

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

  //------------------------------------------------------------
  //                 GETTERS (dynamic *this*)
  //------------------------------------------------------------

  /**
   * @example "inodisDB", "lemontigerDB", ...
   * @todo should be a `Collection`.. ??
   */
  public static get DB(): ArangoDBStruct {
    return this._db;
  }

  /**
   * @example "nodes", "edges", ...
   * @todo should be a `Collection`.. ??
   */
  public static get Type(): string {
    return this._type;
  }

  /**
   * @example "skills", "jobs", "users", ...
   * @todo should be a `Collection`.. ??
   */
  public static get Class(): string {
    return this._class;
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


  //------------------------------------------------------------
  //                    BASICS
  //------------------------------------------------------------

  static async count(): Promise<number> {
    await this.ready();
    return await (await this._coll.count()).count;
  }

  /**
   * @todo test HARD LIMIT
   */
  static async all<T extends Entity>(): Promise<T[]> {
    await this.ready();
    const results = await this.execQuery(allQuery(this._coll));
    return results.map(res => this.fromArangoStruct(res));
  }

  /**
   * 
   */
  static async forceViewSync(): Promise<void> {
    await this.ready();
    await this.execQuery(forceViewQuery(this.VIEW));
    return null;
  }

  //------------------------------------------------------------
  //                    GET-> BY FIELD
  //------------------------------------------------------------

  /**
   * 
   * @param label 
   */
  static async byLabel<T extends Entity>(label: string): Promise<T> {
    return await this.byField(this.LABEL_FLD, label);
  }

  /**
   * 
   * @param field 
   * @param value 
   */
  static async byField<T extends Entity>(field: string, value: any): Promise<T> {
    await this.ready();
    const query = byFieldQuery(this._coll, field, value);
    const items = await this.execQuery(query);
    if (items == null || items[0] == null) {
      return null;
    }
    return items[0] ? (this.fromArangoStruct(items[0]) as T) : null;
  }



  //------------------------------------------------------------
  //                    GET -> BY _ID
  //------------------------------------------------------------

  /**
   *
   * @param uuid {string}
   */
  static async getOne<T extends Entity>(uuid: string): Promise<T> {
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
  static async getMany<T extends Entity>(uuids: string[], limit: number): Promise<T[]> {
    await this.ready();
    const query = getQuery(this._coll, uuids, limit);
    const results: any[] = await this.execQuery(query);
    return results.map(res => this.fromArangoStruct(res));
  }

  //------------------------------------------------------------
  //                    FIND -> BY SEARCH
  //------------------------------------------------------------

  /**
   *
   * @param search {string} search string
   */
  static async findOne<T extends Entity>(search: string): Promise<T> {
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
  static async findMany<T extends Entity>(search: string, limit: number): Promise<T[]> {
    await this.ready();
    const query = findQuery(this.VIEW, this.SEARCH_FLD, search, limit);
    const results: any[] = await this.execQuery(query);
    return results.map(res => this.fromArangoStruct(res));
  }

  //------------------------------------------------------------
  //                 CREATE / UPDATE / DELETE
  //------------------------------------------------------------

  /**
   * 
   * @param data 
   */
  static async create<D extends {}, T extends Entity = Entity>(data: D): Promise<T> {
    await this.ready();
    const query = createQuery(this._coll, data);
    const newItems: BaseEntity[] = await this.execQuery(query);
    if (newItems == null || newItems[0] == null) {
      return null;
    }
    return this.fromArangoStruct(newItems[0]) as T;
  }

  /**
   * 
   * @param data 
   */
  static async upsert<D extends {}, T extends Entity = Entity>(data: D): Promise<T> {
    await this.ready();
    const query = upsertQuery(this._coll, data, this.UNIQUE_ATT);
    const newItems: BaseEntity[] = await this.execQuery(query);
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
  static async update<T extends Entity, D extends {}>(uuid: Uuid, newData: D): Promise<T> {
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
  static async delete<T extends Entity, D extends {}>(uuid: Uuid): Promise<Uuid> {
    await this.ready();
    const checkQuery = getQuery(this._coll, [uuid], 1);
    const items: any[] = await this.execQuery(checkQuery);
    if (!items[0]) {
      return null;
    }
    const delQuery = deleteQuery(this._coll, uuid);
    const deletedKey = await this.execQuery(delQuery).catch(err);
    return deletedKey[0];
  }

  //------------------------------------------------------------
  //                    JUST ENGINEERING...
  //------------------------------------------------------------

  /**
   * The <T> allows us to at least correctly 
   * interpret the result from the outside..
   */
  toJson<T>() {
    return this._entity as T;
  }

  /**
   * We include the (uuid) key in our internal
   * entity representation or consumption by the API
   *
   * @todo do we need the generics? it seems the `new this()`
   *       determines the return value anyways, when called
   *       via `this.fromArangoStruct`..
   */
  static fromArangoStruct<T extends Entity>(ae: BaseEntity): T {
    const entity = new this() as T;
    const { _id, _rev, ...rest } = ae;
    entity._id = _id;
    entity._rev = _rev;
    entity._key = ae._key;
    entity._entity = rest;
    return entity;
  }

  /**
   * Ensures the ._db & ._coll members are set correctly
   * before attempting any DB operations
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

  /**
   * `this` only properly works when execQuery is called
   * on a sub-class (e.g. Skill.execQuery), otherwise
   * this.Type & this.Class will be undefined...
   *
   * @param query {string} aql generated query string
   * @return {array} results
   */
  static async execQuery(query) {
    // await this.ready();
    const cursor = await this._db.conn.query(query).catch(err);
    // console.debug('CURSOR: ', cursor);    
    if (cursor == null) {
      // throw new Error("ArangoDB returned NULL cursor...");
      return null;
    }
    return await cursor.all();
  }

}
