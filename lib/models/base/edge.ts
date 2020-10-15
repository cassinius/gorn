import { EdgeCollection } from 'arangojs/collection';
import { BaseDoc } from "./basedoc";
import { CollType } from '../../types/arangoTypes';

/**
 * @todo an edge always has 
 */
export class ArangoEdge extends BaseDoc {
  public static _type = CollType.EDGE;
  protected static _coll: EdgeCollection;
}
