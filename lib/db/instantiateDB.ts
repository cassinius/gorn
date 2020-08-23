import { Graph } from "arangojs/graph";
import { ArangoSearchView } from "arangojs/view";
import { DocumentCollection, EdgeCollection, CollectionType } from "arangojs/collection";
import { CollType, ArangoDBStruct, emptyDB, ArangoUnit } from "../types/arangoTypes";
import { getArangoDBConn } from "./arangoConn";

/**
 *
 * @param ref
 * @param collType
 */
async function createOrConfirm(ref: ArangoUnit, collType: CollType) {
  if (await ref.exists()) {
    console.log(`${collType} obj. '${ref.name}' already exists.`);
  } else {
    switch (collType) {
      case CollType.NODE:
        await (ref as DocumentCollection).create({ keyOptions: { type: "uuid" } });
        break;
      case CollType.EDGE:
        await (ref as EdgeCollection).create({
          type: CollectionType.EDGE_COLLECTION,
          keyOptions: { type: "uuid" },
        });
        break;
      case CollType.GRAPH:
        await (ref as Graph).create([]);
        break;
      case CollType.VIEW:
        await (ref as ArangoSearchView).create();
        break;
    }
    console.log(`Created ${collType} obj. '${ref.name}'.`);
  }
}

/**
 *
 * @param handles
 * @param type
 */
async function ensureExists(db: ArangoDBStruct, type: CollType) {
  switch (type) {
    case CollType.NODE:
      for (let key of Object.keys(db.nodes)) {
        db.nodes[key] = await db.conn.collection(key);
        await createOrConfirm(db.nodes[key], CollType.NODE);
      }
      break;
    case CollType.EDGE:
      for (let key of Object.keys(db.edges)) {
        db.edges[key] = await db.conn.collection(key);
        await createOrConfirm(db.edges[key], CollType.EDGE);
      }
      break;
    case CollType.GRAPH:
      for (let key of Object.keys(db.graphs)) {
        db.graphs[key] = await db.conn.graph(key);
        await createOrConfirm(db.graphs[key], CollType.GRAPH);
      }
      break;
    case CollType.VIEW:
      for (let key of Object.keys(db.views)) {
        db.views[key] = await db.conn.view(key);
        await createOrConfirm(db.views[key], CollType.VIEW);
      }
      break;
    default:
      console.log("What thingy is that !?");
  }
}

/**
 * Just a handle to 'remember' the (instantiated) db
 *
 * @todo this is rather primitive...
 */
let DB: ArangoDBStruct = emptyDB;

/**
 * We just assume that if a `conn` has been set on the object,
 * it was fully instantiated and is valid & ready to use
 *
 * - of course that assumption only holds if the struct was
 *   instantiated via this method in the first place,
 *   but right now I don't care enough to do anything about it...
 */
export async function getDBStruct(db: ArangoDBStruct): Promise<ArangoDBStruct> {
  if (DB.conn) {
    console.log("DB already instantiated.");
    db = DB;
    return db;
  }
  console.log("Instantiating DB first time.");
  db.conn = await getArangoDBConn();
  await ensureExists(db, CollType.NODE);
  await ensureExists(db, CollType.EDGE);
  await ensureExists(db, CollType.GRAPH);
  await ensureExists(db, CollType.VIEW);
  DB = db;
  return db;
}

/**
 * Simulated main function
 *
 * - for manual testing via e.g. a yarn task
 */
(async function MAIN() {
  if (require.main === module) {
    console.log("Called directly - executing MAIN");
    const db = await getDBStruct(emptyDB);
    console.log(db);
  }
})();
