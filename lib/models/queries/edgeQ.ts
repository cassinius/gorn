import { aql } from "arangojs";
import { EdgeCollection } from "arangojs/collection";

/**
 * Since the DB might have no unique index on `[_from, _to]`, 
 * we use a `LIMIT 1` directive to only fetch the first match
 *
 * @param coll
 * @param _from {string} ._id of _from node
 * @param _to {string} ._id of _to node 
 * 
 */
export function byNodesQuery(coll: EdgeCollection<any>, from: string, to: string) {
  return aql`
    FOR d IN ${coll}
    FILTER d._from == ${from} AND d._to == ${to}
    LIMIT 1
    RETURN d
  `;
}
