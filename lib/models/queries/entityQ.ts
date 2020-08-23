import { aql } from "arangojs";
import { ArangoUnit } from "../../types/arangoTypes";
import { ArangoSearchView } from "arangojs/view";
import { DOC, getSearchTextBlock } from "./miscQ";

/**
 * Since the DB might have no unique index on `label`, we
 * use a `LIMIT 1` directive to only fetch the first match
 *
 * @param coll
 * @param label
 * 
 * @todo generalize to _label field...
 */
export function labelQuery(coll: ArangoUnit, label_field: string, label: string) {
  return aql`
    FOR d IN ${coll}
    FILTER d.${label_field} == ${label}
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
export function getQuery(coll: ArangoUnit, uuids: string[], limit: number) {
  return aql`
    FOR d IN ${coll}
    FILTER d._key IN ${uuids}
    LIMIT ${limit}
    RETURN d
  `;
}

/**
 *
 */
export const findQuery = (
  view: ArangoSearchView,
  attrs: string[],
  search: string,
  limit: number
) => {
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
};
