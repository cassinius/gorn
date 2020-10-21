import { DocumentCollection } from "arangojs/collection";
import { BaseEdgeEntity, CollType } from "../../types";
import { Entity } from "./entity";
import { ArangoNode } from "./node";
import { ArangoEdge } from "./edge";

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
export interface HE3Params {
  fromNode: ArangoNode;
  infoNode: ArangoNode;
  toNode: ArangoNode;
  nodeFeatures: {};

  /**
   * @todo do we need edgeFeatures for all Edges ??
   */
  infoFeatures: {};
  // fromFeatures: {};
  // toFeatures: {};
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
 * A hyper-edge does not have any direct mapping to a DB record.
 * This means there is no natural way to retrieve it without
 * knowing what you're looking for.
 *
 * @description A hyperedge does not have it's own _feature vector,
 *              otherwise it would need a collection / table as well,
 *              and we want it to be a purely logical structure.
 *
 * @todo retrieving from a hyperedge should be handled via a mixin...
 *
 * @todo What's a good threshold of abstraction? Let's think about it in terms of transactions:
 *
 * Passing in "some" field descriptors from an input file and
 * trusting the hyperedge to know how to instantiate an object is
 * on the wrong level of abstraction (a hyperedge SHOULD only be
 * responsible for the wiring, not the lookup & instantiation of nodes).
 *
 * - if any of the nodes do not exist, we want to create them -> but only from the outside, right ??
 * - if the whole inner hyper-edge creation fails, we want to roll-back (delete) created nodes, right ??
 * - we hand references to nodes to the hyperedge, asking it to connect them for us...
 * - internally, if any edge creation fails, the HE should roll-back & give an error
 *
 * - Is a hyper-edge responsible for node creation? -> NO
 *    -> so we roll-back manually??
 * - Is a hyper-edge responsible for edge creation? -> YES
 *
 * @todo review the literature whether this structure makes actual sense...
 *
 */
export class HyperEdge3 extends Entity {
  public static _type = CollType.NODE;
  public static _coll: DocumentCollection;

  protected static hyperNode: typeof ArangoNode;
  protected static fromEdgeKlass: typeof ArangoEdge;
  protected static infoEdgeKlass: typeof ArangoEdge;
  protected static toEdgeKlass: typeof ArangoEdge;

  /**
   * Hyperedge node instances
   */
  protected _hyperNode: ArangoNode;
  protected _fromNode: ArangoNode;
  protected _toNode: ArangoNode;
  protected _infoNode: ArangoNode;

  /**
   * Hyperedge edge instances
   */
  protected _fromEdge: ArangoEdge;
  protected _toEdge: ArangoEdge;
  protected _infoEdge: ArangoEdge;

  /**
   * GETTERS / SETTERS FOR POLYMORPHISM
   */
  public static get HyperNode() {
    return this.hyperNode;
  }

  public static get FromEdge() {
    return this.fromEdgeKlass;
  }

  public static get InfoEdge() {
    return this.infoEdgeKlass;
  }

  public static get ToEdge() {
    return this.toEdgeKlass;
  }

  /**
   *
   * We need to override the count() method since we have no DB collection of our own...
   */
  static async count(): Promise<number> {
    await this.ready();
    return await this.HyperNode.count();
  }

  /**
   *
   * CREATE - take 3 nodes and connect them internally
   *
   * - nodes already exist
   * - edges are created here
   *
   * @todo shall we do transactions / rollback ?
   *       -> not yet
   * @todo shall we check for different nodes ? -> && _from !== _info && _info !== _to && _from !== _to
   *       -> maybe in Version 55.0...
   *
   * @todo how to deal with exceptions ?
   *       -> let the outside world deal with it !
   *
   * @todo if we catch errors in here, we cannot use / log them on the outside,
   *       but if we don't catch them in here, we end the hyper-edge creation
   *       in any case, even if the operation is assumed to continue...
   *
   *       => so ONLY HANDLE ABSOLUTE failures in here & rollback, else
   *          make sure that creation is conditional (upsert e.g.)
   */
  static async create(params: HE3Params): Promise<HyperEdge3> {
    if (!(params.fromNode && params.infoNode && params.toNode)) {
      throw new Error("all 3 nodes of a 3-hyper-edge must exist & be valid.");
    }

    const hyper = new HyperEdge3();
    hyper._fromNode = params.fromNode;
    hyper._infoNode = params.infoNode;
    hyper._toNode = params.toNode;
    // console.log('HYPER HYPER: ', this.HyperNode);

    const errors = [];

    // Upserting will succeed in any "normal" case (it's just a bit slow...)
    hyper._hyperNode = <ArangoNode>(
      await this.HyperNode.upsert(params.nodeFeatures).catch((e: Error) =>
        errors.push("HyperEdge -> NODE creation failed...", e.message)
      )
    );

    hyper._fromEdge = <ArangoEdge>await this.fromEdgeKlass
      .create<BaseEdgeEntity>({
        _from: hyper._fromNode._id,
        _to: hyper._hyperNode._id,
      })
      .catch((e: Error) =>
        errors.push("HyperEdge -> FROM edge creation failed...", e.message)
      );

    hyper._infoEdge = <ArangoEdge>await this.infoEdgeKlass
      .create<BaseEdgeEntity>({
        _from: hyper._infoNode._id,
        _to: hyper._hyperNode._id,
        ...params.infoFeatures,
      })
      .catch((e: Error) =>
        errors.push("HyperEdge -> INFO edge creation failed...", e.message)
      );

    hyper._toEdge = <ArangoEdge>await this.toEdgeKlass
      .create<BaseEdgeEntity>({
        _from: hyper._hyperNode._id,
        _to: hyper._toNode._id,
      })
      .catch((e: Error) =>
        errors.push("HyperEdge -> TO edge creation failed...", e.message)
      );

    /**
     * @todo primitive...
     */
    if ( errors.length ) {
      throw new Error("HyperEdge creation encountered errors: " + errors.join(''));
    }

    return hyper;
  }
}
