import { ArangoDoc } from "../../types/baseTypes";
import { ArangoDBStruct, CollType, Nodege } from "../../types/arangoTypes";
import { getDBStruct } from "../../db/instantiateDB";

/**
 * CONCERNING ALL STATIC METHODS
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
 */
export class Entity implements ArangoDoc {
  _id?: string;
  _key?: string;
  _rev?: string;
  _from?: string;
  _to?: string;

  //=====================================================
  //=         POLYMORPHIC (STATIC) ATTRIBUTES
  //=====================================================
  /**
   * These properties will only be initialized
   * in specific derived classes, since we can
   * not know the particular DB structure
   * in beforehand.
   */
  protected static _db: ArangoDBStruct;

  /**
   * @description type of DB object
   * @example `Node`, `Edge`, `Graph` or `View`
   */
  protected static _type: CollType;

  /**
   * Collection - the reference to the actual DB handle
   *
   * All objects have one - also Graphs and SearchViews
   *
   * @description the DB unit holding items of `this` type
   */
  protected static _coll: Nodege;

  /**
   *
   * Textual description of the collection handle
   *
   * All objects have one - just like _coll
   *
   * @todo ideally the following properties should all be type-constrained,
   *       - but in a flexible way
   *       - which means we'd need polymorphic enums !?
   *       - e.g. "must be member of an 'Attr' enum or such.."
   */
  protected static _class: string;

  //=====================================================
  //=              GETTERS (dynamic *this*)
  //=====================================================

  /**
   * @example "inodisDB", "lemontigerDB", ...
   * @todo should be a `Collection`.. ??
   */
  public static get DB(): ArangoDBStruct {
    return this._db;
  }

  /**
   * @example "nodes", "edges",
   */
  public static get Type(): string {
    return this._type;
  }

  /**
   * @example "skills", "products", "users", ...
   * @todo should be a `Collection`.. ??
   */
  public static get Class(): string {
    return this._class;
  }

  //=====================================================
  //=                JUST ENGINEERING...
  //=====================================================

  /**
   * Ensures the ._db & ._coll members are set correctly
   * before attempting any DB operations
   *
   * @todo this._db should be the instantiated & valid db struct
   *       for whatever application...
   */
  static async ready() {
    this._db = await getDBStruct(this.DB);
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
    // console.debug('QUERY: ', query);

    const cursor = await this._db.conn.query(query);

    // console.debug('CURSOR: ', cursor);

    if (cursor == null) {
      // throw new Error("ArangoDB returned NULL cursor...");
      return null;
    }
    return await cursor.all();
  }
}
