import { aql } from "arangojs";
import { Nodege, Uuid } from "../../types";
import { ArangoSearchView } from "arangojs/view";
import { DOC, getSearchTextBlock } from "./miscQ";


const DEFAULT_LIMIT = 30;

/**
 *
 * @param coll
 */
export function allQuery(coll: Nodege) {
  return aql`FOR d IN ${coll} LIMIT ${DEFAULT_LIMIT} RETURN d`;
}

export function forceViewQuery(view: ArangoSearchView) {
  return `
    FOR i IN ${view.name} 
    OPTIONS { waitForSync: true } 
    LIMIT 1 
    RETURN i._key
  `;
}


/**
 * Since the DB might have no unique index on `label`, we
 * use a `LIMIT 1` directive to only fetch the first match
 *
 * @param coll
 * @param value {any} value to compare to
 * 
 */
export function byFieldQuery(coll: Nodege, field: string, value: any) {
  return aql`
    FOR d IN ${coll}
    FILTER d.${field} == ${value}
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
 * @todo First LIMIT, then SORT - WTF Arango ??!!
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
    LIMIT @limit
    SORT TFIDF(d) DESC
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
    INSERT ${data} 
    INTO ${nodes}
    OPTIONS { overwriteMode: "conflict" }
    RETURN NEW
  `;
}

/**
 * 
 * @param nodes
 * @param data
 * @param uniqueAttrs
 * 
 */
export function upsertQuery<D extends {}>(nodes: Nodege, data: D, uniqueAttrs: string[]) {
  const query =`
    UPSERT @unique_data
    INSERT @insert_data
    UPDATE @update_data
    IN ${nodes.name}
    OPTIONS {
      exclusive: true,
      ignoreRevs: true
    }
    RETURN NEW
  `;

  const unique_data = {};
  uniqueAttrs.forEach(att => unique_data[att] = data[att]);

  const bindVars = {
    unique_data,
    insert_data: data,
    update_data: data
  };

  // console.debug(query);
  // console.debug(bindVars);  

  return {
    query,
    bindVars
  }
}

/**
 *
 * @param nodes
 * @param data
 */
export function updateQuery<D extends {}>(nodes: Nodege, uuid: Uuid, data: D) {
  return aql`
    FOR d IN ${nodes}
    FILTER d._key == ${uuid}
    UPDATE d WITH ${data} 
    IN ${nodes}
    RETURN NEW
  `;
}

/**
 *
 * @param nodes
 * @param data
 */
export function deleteQuery<D extends {}>(nodes: Nodege, uuid: Uuid) {
  const query = `
    LET doc = DOCUMENT('${nodes.name}/${uuid}')
    REMOVE doc IN ${nodes.name}
    LET removed = OLD 
    RETURN removed._key
  `;
  return {
    query,
    bindVars: {},
  };
}
