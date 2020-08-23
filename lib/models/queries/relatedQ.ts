import { aql } from "arangojs";
import { DocumentCollection } from "arangojs/collection"
import { AqlQueryStruct } from "../../types/arangoTypes";
import { ArangoSearchView } from "arangojs/view";
import { getSearchTextBlock } from "./miscQ";

const LIMIT_START_SET = 30;
const LIMIT_RETURN_SET = 50;

/**
 * @todo replace default LIMITS
 *
 * @param search
 * @param d
 */
export function relGetQuery(
  nodes: DocumentCollection,
  edges: string,
  uuids: string[],
  dist: number
) {
  return aql`
    FOR d IN ${nodes}
    FILTER d._key IN ${uuids}
    LIMIT 1

    FOR v, e, p IN 1..${dist} ANY
      d
      ${edges}
    LIMIT ${LIMIT_RETURN_SET}
    RETURN DISTINCT v
  `;
}

/**
 * @todo replace default LIMITS
 *
 * @param search
 * @param d
 */
export function relFindQuery(
  view: ArangoSearchView,
  edges: string,
  attrs: string[],
  search: string,
  dist: number
): AqlQueryStruct {
  const searchBlock = getSearchTextBlock(attrs, 'd');
  const query =`
    LET keywords = TOKENS(@search, 'text_en')
    
    FOR d IN ${view.name}
      ${searchBlock}
    SORT BM25(d) DESC
    LIMIT ${LIMIT_START_SET}

    FOR v, e, p IN 1..@dist ANY
      d
      ${edges}
    LIMIT ${LIMIT_RETURN_SET}

    RETURN DISTINCT v
  `;
  return {
    query,
    bindVars: {
      search,
      dist
    }
  }
}
