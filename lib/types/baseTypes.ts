export type Uuid = string;

/**
 * Base Collections to be extended
 */
export const BaseCollections = {}

/**
 * All Arango documents have these properties
 * We can internally use them when calling DB
 * operations on objects, and wont return them
 * to the calling API.
 *
 * An Esco entity's `uuid` field however, is part
 * of the underlying entity, unique over all
 * DB instances in a cluster, and will be returned
 * to the calling API.
 */
export interface ArangoDoc {
  _id?: string;
  _key?: string;
  _rev?: string;
  _from?: string;
  _to?: string
}

/**
 * For type-checking at runtime, which cannot
 * be done via an interface (not elegant...)
 */
export class ArangoDoc {}
