import { DocumentCollection } from "arangojs/collection";

import { CollType } from "../../types";

import { Entity} from "../base/entity";
import { ArangoNode } from "../base/node";
import { ArangoEdge } from "../base/edge";


/**
 * Information we need in order to create a hyperedge
 *
 * @description no implicit node creation!
 *
 * @property {string} fromKey Key to lookup _fromNode
 * @property {string} infoKey Key to lookup _infoNode
 * @property {string} toKey Key to lookup _toNode
 * @property {object} nodeData features to be stored in the Hyperedge itself
 * @property {object} edgeData will be deconstructed into separate edge feature vectors
 * 
 * @todo making all properties optional is **nonsense** but required if we want to override the base method's `create` method
 */
export interface HE3CreateCfg {
  fromNode: ArangoNode;
  infoNode: ArangoNode;
  toNode: ArangoNode;
  nodeData: {};
  edgeData: {};
}

/**
 *
 * Hyperedge class spanning exactly 3 Nodes (apart from itself)
 * 
 * Responsibilities:
 * 
 * 1. WIRING (Abstraction) give us one datastructure to handle the whole 'knot' of internal connections
 * 2. LIFECYCLE (Transaction) handle the internal complexity in `upsertion` and `rollback`
 * 3. QUERYING (Simplification) handle the internal complexity in queries and present transparent results to the outside
 * 4. ...?
 * 
 * Structure:
 *
 * - _fromNode: the node that would have been the source
 * - _toNode: the node that would have been the target
 * - _infoNode: the node containing side info we can't / don't want to store in a single edge feature vector
 *
 * and we connect them via three edges
 *
 * - _fromEdge: _fromNode -> this
 * - _infoEdge: _infoNode -> this
 * - _toEdge: this -> _toNode
 *
 * @todo review the literature whether this makes actual sense...
 *
 * @todo make sure the edges can only connect to US
 * 
 * @todo what are the responsibilities of a hyperedge ?
 *
 */
export class ArangoHyperEdge3 extends Entity {
  public static _type = CollType.NODE;
  public static _coll: DocumentCollection;

  /**
   * @todo do we have special mandatory hyperedge features ?
   */
  public _features: {};

  /**
   * Hyperedge Nodes
   *
   * @todo can those be of same type at Runtime or do we need more explicit typing (is it actually possible)
   */
  public static _fromNode: ArangoNode;
  public static _toNode: ArangoNode;
  public static _infoNode: ArangoNode;

  /**
   * Hyperedge Edges
   */
  public static _fromEdge: ArangoEdge;
  public static _toEdge: ArangoEdge;
  public static _infoEdge: ArangoEdge;

  /**
   * CREATE - we wrap the create procedures BUT have to rename it
   *
   * 1. each
   *
   * @todo shall we pass node handles or Keys / IDs ?
   * @todo shall we do transactions / rollback ?
   * @todo shall we check for different nodes ? -> && _from !== _info && _info !== _to && _from !== _to
   * @todo any good reason **NOT** to use `this.getOne` ??
   * 
   */
  static async create<C extends HE3CreateCfg, T extends ArangoHyperEdge3>(params: C): Promise<T> {
    this._fromNode = params.fromNode;
    this._infoNode = params.infoNode;
    this._toNode = params.toNode;

    if ( !(this._fromNode && this._infoNode && this._toNode) ) {
      throw new Error("all 3 nodes of a 3-hyper-edge must exist.");
    }

    /**
     * @todo do we need dynamic lookup of Edge feature vector types?? -> We can't right??
     */
    // this._fromEdge = await ArangoEdge.create<>

    throw new Error("creation not finished yet... please wait a couple billion years...");

    // return await super.create(cfg.nodeData);
  }

}
