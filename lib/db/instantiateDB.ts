import { Graph } from "arangojs/graph";
import { ArangoSearchView } from "arangojs/view";
import { DocumentCollection, EdgeCollection, CollectionType } from "arangojs/collection";
import { CollType, ArangoDBStruct, emptyDB, ArangoUnit } from "../types/arangoTypes";
import { getArangoDBConn } from "./arangoConn";
import { errLog, errReq, errSig, errSilent } from "../helpers/error";

/**
 * @description insure = insert + ensure ;-)
 */
async function insureNodes(ref: DocumentCollection) {
  if (await ref.exists()) {
    console.log(`Nodes '${ref.name}' already exists.`);
  } else {
    await ref.create({ keyOptions: { type: "uuid" } }).catch(errSig);
    console.log(`Created Nodes ${ref.name}`);
  }
}

async function insureEdges(ref: EdgeCollection) {
  if (await ref.exists()) {
    console.log(`Edges '${ref.name}' already exists.`);
  } else {
    await ref.create({
      type: CollectionType.EDGE_COLLECTION,
      keyOptions: { type: "uuid" }
    }).catch(errSig);
    console.log(`Created Edges ${ref.name}`);
  }
}

async function insureGraph(ref: Graph) {
  if (await ref.exists()) {
    console.log(`Graph '${ref.name}' already exists.`);
  } else {
    await ref.create([]).catch(errSig);
    console.log(`Created Graph ${ref.name}`);
  }
}

async function insureView(ref: ArangoSearchView) {
  if (await ref.exists()) {
    console.log(`View '${ref.name}' already exists.`);
  } else {
    await ref.create().catch(errSig);
    console.log(`Created View ${ref.name}`);
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
        await insureNodes(db.nodes[key]);
      }
      break;
    case CollType.EDGE:
      for (let key of Object.keys(db.edges)) {
        db.edges[key] = await db.conn.collection(key);
        await insureEdges(db.edges[key]);
      }
      break;
    case CollType.GRAPH:
      for (let key of Object.keys(db.graphs)) {
        db.graphs[key] = await db.conn.graph(key);
        await insureGraph(db.graphs[key]);
      }
      break;
    case CollType.VIEW:
      for (let key of Object.keys(db.views)) {
        db.views[key] = await db.conn.view(key);
        await insureView(db.views[key]);
      }
      break;
    default:
      console.log("What kind of thingy is *that* !?");
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
    // console.log("DB already instantiated.");
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
