import { EdgeCollection } from 'arangojs/collection';
import { EdgeEntity, Entity } from './entity';
import { CollType } from '../../types/arangoTypes';

/**
 * @todo an edge always has 
 */
export class ArangoEdge extends EdgeEntity {
  public static _type = CollType.EDGE;
  protected static _coll: EdgeCollection;
}
