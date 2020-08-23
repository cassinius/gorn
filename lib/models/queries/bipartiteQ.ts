import { aql } from "arangojs";
import { DocumentCollection } from "arangojs/collection";
import { ArangoSearchView } from "arangojs/view";
import { DOC, getSearchTextBlock } from "./miscQ";

const DEFAULT_LIMIT = 30;

/**
 * For Bi-partite (sub)graphs, we assume that direction
 * is irrelevant (that is, we assume that the bi-partite
 * subgraph is correctly modeled to begin with).
 *
 * @todo nodes & edges collections should be configured
 *       by the mixin, not on a per-use basis
 *
 * @todo for job->skills relations, we have an additional
 *       `must` parameter (essential or optional skill),
 *       -> for a generic ORM, move this into a mixin
 *         config object
 * 
 * @todo took out the edge filter, since it yielded too
 *       few results in many cases:
 *       FILTER p.edges[*].relType ALL == ${must ? "essential" : "optional"}
 */
export function getOtherQuery(
  nodes: DocumentCollection,
  edges: string,
  uuids: string[],
  dist: number
) {
  const limit = Math.min(DEFAULT_LIMIT, uuids.length);

  return aql`
    FOR d IN ${nodes}
    FILTER d._key IN ${uuids}
    LIMIT ${limit}
    
    FOR v, e, p IN ${dist}..${dist} ANY 
    d
    ${edges}
    LIMIT 30

    RETURN DISTINCT v
  `;
}

/**
 * @todo took out `must`: FILTER p.edges[*].relType ALL == ${must ? "essential" : "optional"}
 */
export function getPeerQuery(
  nodes: DocumentCollection,
  edges: string,
  uuids: string[],
  rets: string[],
  dist: number
) {
  const limit = Math.min(DEFAULT_LIMIT, uuids.length);
  const retFieldString = rets.map(r => `${r}: p.vertices[*].${r}`).join(',\n');
  
  // console.debug('COLLECT RETURN VALUE STRING: ', retFieldString);

  const query = `
    FOR d IN ${nodes.name}
    FILTER d._key IN @uuids
    LIMIT ${limit}
    
    FOR o, e, p IN @dist..@dist ANY 
    d
    @edges
    LIMIT 30

    COLLECT
    edges = {
      from: p.edges[*]._key,
      to: p.edges[*]._key
    },
    path = {
      uuids: p.vertices[*]._key,
      ${retFieldString}
    }
    RETURN { edges: edges, path: path }
  `;

  // console.debug(query);

  return {
    query,
    bindVars: {
      edges,
      uuids,
      dist
    },
  };
}

/**
 * 
 * @todo standardize parameters into `FindParams`
 * 
 */
export async function findOtherQuery(
  view: ArangoSearchView,
  attrs: string[],
  edges: string,
  search: string,
  rets: string[]
) {
  const searchBlock = getSearchTextBlock(attrs, DOC);
  const sourceRetFieldString = rets.map(r => `${r}: d.${r}`).join(',\n');
  const targetRetFieldString = rets.map(r => `${r}: target.${r}`).join(',\n');
  /**
   * We're assembling the query text including
   * binding variables ourselves, since this is
   * the only possibility
   */
  const query = `
  LET keywords = TOKENS(@search, 'text_en')
  
  FOR d IN ${view.name}
    ${searchBlock}
  SORT BM25(d) DESC
  LIMIT 30
  
  FOR vertex, edge, path IN 1..1 ANY
  d
  @edges
  LIMIT 50
  
  COLLECT source = {
    uuid: d._key,
    ${sourceRetFieldString}
  } INTO targetGroups
  
  let targets = (
    FOR target IN targetGroups[*].vertex
    RETURN DISTINCT {
      uuid: target._key,
      ${targetRetFieldString}
    }
  )
  
  RETURN {
    source: source,
    targets: targets
  }
  `;
  // console.debug(query);
  return {
    query,
    bindVars: {
      search,
      edges
    },
  };
}

/**
 * @todo let's first try with normal fulltext, just switch to
 *       search
 * @param search
 */
export async function findPeerQuery(
  view: ArangoSearchView,
  attrs: string[],
  edges: string,
  search: string,
  rets: string[]
) {
  const searchBlock = getSearchTextBlock(attrs, DOC);
  const retFieldString = rets.map(r => `${r}: p.vertices[*].${r}`).join(',\n');
  const query = `
    LET keywords = TOKENS(@search, 'text_en')
    
    FOR d IN ${view.name}
      ${searchBlock}
    SORT BM25(d) DESC
    LIMIT 10
    
    FOR o, e, p IN 2..2 ANY
    d
    @edges
    LIMIT 30

    COLLECT
    edges = {
      from: p.edges[*]._key,
      to: p.edges[*]._key
    },
    path = {
      uuids: p.vertices[*]._key,
      ${retFieldString}
    }
    RETURN { edges: edges, path: path }
  `;
  // console.debug(query);
  return {
    query,
    bindVars: {
      search,
      edges,
    },
  };
}
