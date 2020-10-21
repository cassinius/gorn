import { aql } from "arangojs";
import { EdgeCollection } from "arangojs/collection";

/**
 * Since the DB might have no unique index on `label`, we
 * use a `LIMIT 1` directive to only fetch the first match
 *
 * @param coll
 * @param value {any} value to compare to
 * 
 */
export function byNodesQuery(coll: EdgeCollection<any>, from: string, to: string) {
  return aql`
    FOR d IN ${coll}
    FILTER d._from == ${from} AND d._to == ${from}
    LIMIT 1
    RETURN d
  `;
}
