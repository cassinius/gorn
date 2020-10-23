import { aql } from "arangojs";
import { Nodege, Uuid } from "../../types";

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
