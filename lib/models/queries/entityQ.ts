import { aql } from "arangojs";
import { Nodege } from "../../types/arangoTypes";
import { ArangoSearchView } from "arangojs/view";
import { DOC, getSearchTextBlock } from "./miscQ";

/**
 * Since the DB might have no unique index on `label`, we
 * use a `LIMIT 1` directive to only fetch the first match
 *
 * @param coll
 * @param label
 *
 * @todo fulltext as slow as filter ??
 */
export function labelQuery(coll: Nodege, labelField: string, label: string) {
  return aql`
    FOR d IN ${coll}
    FILTER d.${labelField} == ${label}
    LIMIT 1
    RETURN d
  `;
}

/**
 *
 * @param coll
 * @param uuids
 * @param limit
 */
export function getQuery(coll: Nodege, uuids: string[], limit: number) {
  return aql`
    FOR d IN ${coll}
    FILTER d._key IN ${uuids}
    LIMIT ${limit}
    RETURN d
  `;
}

/**
 *
 * @param view
 * @param attrs
 * @param search
 * @param limit
 */
export function findQuery(view: ArangoSearchView, attrs: string[], search: string, limit: number) {
  if (attrs == null || attrs.length === 0) {
    throw new Error("'attrs' argument must be a non-empty array of document attribute paths.");
  }
  const searchBlock = getSearchTextBlock(attrs, DOC);
  const query = `
    LET keywords = TOKENS(@search, 'text_en')
    FOR d IN ${view.name}
      ${searchBlock}
    SORT TFIDF(d) DESC
    LIMIT @limit
    RETURN d
  `;

  // console.debug(query);

  return {
    query,
    bindVars: {
      search,
      limit,
    },
  };
}

/**
 *
 * @param nodes
 * @param data
 */
export function createQuery<D extends {}>(nodes: Nodege, data: D) {
  return aql`
    INSERT ${data} INTO ${nodes}
    OPTIONS { overwriteMode: "update", keepNull: true, mergeObjects: false }
    RETURN NEW
  `;
}
