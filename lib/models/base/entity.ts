import { ArangoSearchView } from "arangojs/view";
import { ArangoUnit, ArangoDBStruct, CollType } from "../../types/arangoTypes";
import { BaseEntity } from "../../types/baseTypes";
import { getQuery, findQuery, labelQuery } from "../queries/entityQ";
import { getDBStruct } from "../../db/instantiateDB";
import { err } from "../../helpers/misc";

/**
 * FOR ALL STATIC METHODS
 *
 * We use `this` to refer to the class object
 * the method was called upon.. e.g. `Skill` or `Job`.
 * Calling `Entity` would result in calling the
 * base-class method or instantiate an object from the
 * base-class, which is not what we desire.
 * 
 * @property {string} _view a string representation of the DB Search View
 * @property {ArangoSearchView} _searchView actual search view object
 *
 */
export class Entity implements BaseEntity {
  _id: string;
  _key: string;
  _rev: string;
  _entity: {};

  /**
   * These properties will only be initialized
   * in specific derived classes, since we can
   * not know the particular DB structure
   * in beforehand.
   */
  protected static _db: ArangoDBStruct;
  protected static _coll: ArangoUnit;
  protected static _type: CollType;
  protected static _searchView: ArangoSearchView;
  /**
   * @todo ideally those should all be type constraine,
   *       - but in a flexible way
   *       - "must be member of an 'Attr' enum or such.."
   */
  protected static _class: string;
  protected static _view: string;
  protected static _labelField: string;
  protected static _searchAttr: string[];
  // which properties to collect, in queries 
  // that don't return the whole object
  protected static _retAttrs: string[];


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
  public static get ATTRS(): string[] {
    return this._searchAttr;
  }

  /**
   * Returns the model's label field
   * @example 'title', 'preferredLabel', etc.
   */
  public static get LABATT(): string {
    return this._labelField;
  }

  /**
   * Returns an array of properties to collect in query results
   * @example ['title', 'concepts'] or ['preferredLabel', 'altLabels']
   */
  public static get RETATT(): string[] {
    return this._retAttrs;
  }

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
    const entity = new this();
    const { _id, _rev, ...rest } = ae;
    entity._id = _id;
    entity._rev = _rev;
    entity._key = ae._key;
    entity._entity = rest;
    return entity as T;
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

  //------------------------------------------------------------
  //                    GET-> BY LABEL
  //------------------------------------------------------------

  static async byLabel<T extends Entity>(label: string): Promise<T> {
    await this.ready();
    const query = labelQuery(this._coll, this.LABATT, label);
    const results = await this.execQuery(query);
    return results[0] ? (this.fromArangoStruct(results[0]) as T) : null;
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
    const query = findQuery(this.VIEW, this.ATTRS, search, 1);
    const results = await this.execQuery(query);
    return results[0] ? (this.fromArangoStruct(results[0]) as T) : null;
  }

  /**
   *
   * @param search {string} search string
   * @param limit {number} result lenth limit
   */
  static async findMany<T extends Entity>(search: string, limit: number): Promise<T[]> {
    await this.ready();
    const query = findQuery(this.VIEW, this.ATTRS, search, limit);
    const results: any[] = await this.execQuery(query);
    return results.map(res => this.fromArangoStruct(res));
  }

  /**
   *
   * `this` only properly works when execQuery is called
   * on a sub-class (e.g. Skill.execQuery), otherwise
   * this.Type & this.Class will be undefined...
   *
   * @param query {string} aql generated query string
   * @return {array} results
   */
  static async execQuery(query) {
    // await this.ready();
    const ftQuery = await this._db.conn.query(query).catch(err);
    return await ftQuery.all();
  }

}
