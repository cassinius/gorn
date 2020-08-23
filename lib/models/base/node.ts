import { DocumentCollection } from "arangojs/collection";
import { Entity } from "./entity";
import { CollType } from "../../types/arangoTypes";

/**
 * 
 * @todo does every Node in a graph exhibit
 *       heterarchical `relevance`, if only in the
 *       form of a similarity measure to other nodes
 *       of the same type?
 *
 *       -> we could need this for natural clustering
 *
 * @todo should this be part of the `ArangoNode`
 *       class or a separate mixin?
 *
 *       -> probably YES
 * 
 */
export class ArangoNode extends Entity {
  public static _type = CollType.NODE;
  protected static _coll: DocumentCollection;
  // protected static _db;
}
