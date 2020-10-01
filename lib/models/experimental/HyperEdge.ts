// import { Entity} from "./base/entity";
import { ArangoNode } from "../base/node";
import { ArangoEdge } from "../base/edge";
import { CollType } from "../../types";
import { DocumentCollection } from "arangojs/collection";


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
  fromKey?: string;
  infoKey?: string;
  toKey?: string;
  nodeData?: {};
  edgeData?: {};
}

/**
 *
 * Hyperedge class spanning exactly 3 Nodes
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
 */
export class ArangoHyperEdge3 extends ArangoNode {
  public static _type = CollType.NODE;
  public static _coll: DocumentCollection;

  /**
   * @todo do we have special mandatory hyperedge features ?
   */
  public _entity: {};

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
  static async create<C extends HE3CreateCfg, T extends ArangoHyperEdge3>(cfg: C): Promise<T> {
    this._fromNode = await this.getOne(cfg.fromKey);
    this._infoNode = await this.getOne(cfg.infoKey);
    this._toNode = await this.getOne(cfg.toKey);

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
