import { ArangoUnit, AqlQueryStruct } from "../../types/arangoTypes";
import { ArangoSearchView } from "arangojs/view";
import { getSearchTextBlock } from "./miscQ";

const LIMIT_START_SET = 5;
const LIMIT_RETURN_SET = 30;

/**
 * @todo TOO MANY RESULTS -> we still need either
 *       - a topical filter in the form of an
 *           additional search in level `l` (quick)
 *       - a constraining radius in embedding space
 *         (better, but more elaborate)
 *
 * @todo Because of this, the method is much more usable for
 *       jobs than skills right now, simply because there
 *       are far fewer 'hierarchy' job edges in the DB
 *
 * @todo if we constrain in embedding space, maybe it's better
 *       to just port our shopify similarity recommender
 *       to this dataset (but adding another external API...??)
 *
 * @todo should level 2 include the level 1's? => probably
 *       but not so fast! We can't go 1..l up and then 1..l
 *       down again, since this would include all the
 *       parent's siblings as well...
 *
 * @todo ignoring the level for the moment ->
 *       security precaution ;-)
 */
export function getSiblingsQuery(
  nodes: ArangoUnit,
  edges: string,
  uuids: string[],
  levels: number
) {
  const query = `
    FOR d IN ${nodes.name}
    FILTER d._key IN @uuids
    LIMIT 1
    
    FOR base, e_up, p_up IN 1..1 OUTBOUND
      d
      ${edges}
    LIMIT ${LIMIT_RETURN_SET}
    
    FOR top, e_down, p_down IN 1..1 INBOUND
      LAST(p_up.vertices)
      ${edges}
    LIMIT ${LIMIT_RETURN_SET}
    
    RETURN LAST(p_down.vertices)
  `;

  return {
    query,
    bindVars: {
      uuids
    }
  }
}

/**
 * @param nodes
 * @param edges
 * @param uuids
 * @param close
 * @param far
 * @param sub {boolean} sub or super relation
 */
export function getSubSuperQuery(
  nodes: ArangoUnit,
  edges: string,
  uuids: string[],
  close: number,
  far: number,
  sub: boolean = true
): AqlQueryStruct {
  const direction = sub ? 'INBOUND' : 'OUTBOUND';
  const query = `
    FOR d IN ${nodes.name}
    FILTER d._key IN @uuids
    LIMIT ${LIMIT_START_SET}

    FOR v, e, p IN @close..@far ${direction}
      d
      ${edges}

    LIMIT ${LIMIT_RETURN_SET}
    RETURN DISTINCT v
  `;
  return {
    query,
    bindVars: {
      uuids,
      close,
      far
    }
  }
}

/**
 * 
 * @param view 
 * @param edges 
 * @param sub 
 * @param search 
 * @param close 
 * @param far 
 */
export function findSubSuperQuery(
  view: ArangoSearchView,
  attrs: string[],
  edges: string,
  search: string,
  close: number,
  far: number,
  sub: boolean = true,
): AqlQueryStruct {
  const direction = sub ? "INBOUND" : "OUTBOUND";
  const searchBlock = getSearchTextBlock(attrs, 'd');
  const query =`
    LET keywords = TOKENS(@search, 'text_en')
    
    FOR d IN ${view.name}
      ${searchBlock}
    SORT BM25(d) DESC
    LIMIT ${LIMIT_START_SET}

    FOR v, e, p IN @close..@far ${direction}
      d
      ${edges}
    LIMIT ${LIMIT_RETURN_SET}
    RETURN DISTINCT v
  `;

  const bindVars = {
    search,
    close,
    far
  };

  // console.debug(query);
  // console.debug(bindVars);

  return {
    query,
    bindVars
  }
}
