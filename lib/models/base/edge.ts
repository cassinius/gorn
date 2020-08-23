import { EdgeCollection } from 'arangojs/collection';
import { Entity } from './entity';
import { CollType } from '../../types/arangoTypes';

export class ArangoEdge extends Entity {
  public static _type = CollType.EDGE;
  protected static _coll: EdgeCollection;
}
