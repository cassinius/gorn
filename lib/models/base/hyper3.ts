import { DocumentCollection } from "arangojs/collection";
import { BaseEdgeEntity, CollType } from "../../types";
import { Entity } from "./entity";
import { ArangoNode } from "./node";
import { ArangoEdge } from "./edge";

type HyperErrors = string[];
export type HyperReturn = [HyperEdge3, HyperErrors];

/**
 * Information we need in order to create a hyperedge
 *
 * @property {string} fromKey Key to lookup _fromNode
 * @property {string} infoKey Key to lookup _infoNode
 * @property {string} toKey Key to lookup _toNode
 * @property {object} nodeData features to be stored in the Hyperedge itself
 * @property {object} edgeData will be deconstructed into separate edge feature vectors
 *
 * @description we do *not* need _features for _from & _to edges, since those are just
 *              the expanded version of a "normal" edge. The info edge however is the 
 *              normalized version of multiple payload entries of the original edge
 *              (e.g. mutliple ratings from the same scale node), so here we "transport"
 *              the information
 */
export interface HE3Params {
  fromNode: ArangoNode;
  infoNode: ArangoNode;
  toNode: ArangoNode;
  nodeFeatures: {};
  infoFeatures: {};
  // infoUnique: boolean;
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
 * @description we do not implicitly create nodes, except for the internal "hyper" node.
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
   * - nodes should already exist
   * - internal (hyper) node is inserted or retrieved
   * - edges are retrieved or created
   *
   * @description we do not make assumptions about node/edge duplication / uniqueness
   *              rules, so we just check for their existence or else try to
   *              create them => only if *both* fails, we throw an Error
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
   *          make sure that creation is conditional (upsert e.g.)\
   * 
   *       => for now, just collect errors & pass them upstream...
   */
  static async create(params: HE3Params): Promise<HyperReturn> {
    if (!(params.fromNode && params.infoNode && params.toNode)) {
      throw new Error("all 3 nodes of a 3-hyper-edge must exist & be valid.");
    }

    const errors = [];

    const hyper = new HyperEdge3();
    hyper._fromNode = params.fromNode;
    hyper._infoNode = params.infoNode;
    hyper._toNode = params.toNode;

    /**
     * `upsert` means all hyper-nodes are required to have `uniqueAttr` set
     */
    hyper._hyperNode = <ArangoNode>await this.HyperNode.upsert(params.nodeFeatures)
      .catch((e: Error) => {
        errors.push('hyper NODE edge creation failed...', e.message);
        return null;
      });

    let fromEdge = <ArangoEdge>await this.fromEdgeKlass.byNodes(hyper._fromNode._id, hyper._hyperNode._id);
    // console.debug('HE FROM edge:', fromEdge, hyper._fromNode._id, hyper._hyperNode._id);

    if (!fromEdge) {
      fromEdge = <ArangoEdge>await this.fromEdgeKlass.create<BaseEdgeEntity>({
        _from: hyper._fromNode._id,
        _to: hyper._hyperNode._id,
      })
        .catch((e: Error) => {
          // console.debug('HE from edge CREATION failed:', hyper._fromNode._id, hyper._hyperNode._id, e.message);
          errors.push('hyper from edge CREATION failed...', hyper._fromNode._id, hyper._hyperNode._id, e.message);
          return null;
        });
    }

    /**
     * if we DON'T have a unique [_from, _to], we want to create an additional edge anyways
     */
    let infoEdge = await this.infoEdgeKlass.uniqueIndex() 
      ? <ArangoEdge>await this.infoEdgeKlass.byNodes(hyper._infoNode._id, hyper._hyperNode._id)
      : null;

    // console.debug('HE INFO edge:', infoEdge, hyper._infoNode._id, hyper._hyperNode._id);

    if (!infoEdge) {
      infoEdge = <ArangoEdge>await this.infoEdgeKlass.create<BaseEdgeEntity>({
        _from: hyper._infoNode._id,
        _to: hyper._hyperNode._id,
        ...params.infoFeatures,
      })
        .catch((e: Error) => {
          errors.push('hyper INFO edge creation failed...', e.message);
          return null;
        });
    }

    let toEdge = <ArangoEdge>await this.toEdgeKlass.byNodes(hyper._hyperNode._id, hyper._toNode._id);
    // console.debug('HE TO edge:', toEdge, hyper._hyperNode._id, hyper._toNode._id);

    if (!toEdge) {
      toEdge = <ArangoEdge>await this.toEdgeKlass.create<BaseEdgeEntity>({
        _from: hyper._hyperNode._id,
        _to: hyper._toNode._id,
      })
        .catch((e: Error) => {
          // console.debug('HE TO edge CREATION failed:', hyper._hyperNode._id, hyper._toNode._id, e.message);
          errors.push('hyper TO edge creation failed...', hyper._hyperNode._id, hyper._toNode._id, e.message);
          return null;
        });
    }

    hyper._fromEdge = fromEdge;
    hyper._infoEdge = infoEdge;
    hyper._toEdge = toEdge;

    return [hyper, errors];
  }

  /**
   * 
   */
  static async truncateCollections() {
    await this.HyperNode.truncateCollection();
    await this.fromEdgeKlass.truncateCollection();
    await this.infoEdgeKlass.truncateCollection();
    await this.toEdgeKlass.truncateCollection();
  }

  /**
   * 
   */
  static async dropCollections() {
    await this.HyperNode.dropCollection();
    await this.fromEdgeKlass.dropCollection();
    await this.infoEdgeKlass.dropCollection();
    await this.toEdgeKlass.dropCollection();
  }
}
