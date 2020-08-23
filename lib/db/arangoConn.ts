import * as dotenv from "dotenv";
import { Database, aql } from "arangojs";

dotenv.config();

let DB_HANDLE: Database = null;

export async function getArangoDBConn() {
  if ( DB_HANDLE ) {
    return DB_HANDLE;
  }

  const now = Date.now();
  DB_HANDLE = new Database({ url: process.env.ARANGO_URL });
  DB_HANDLE.useDatabase(process.env.ARANGO_DB);
  DB_HANDLE.useBasicAuth(process.env.ARANGO_USER, process.env.ARANGO_PWD);
  
  try {
    const cursor = await DB_HANDLE.query(aql`
      RETURN ${now}
    `);
    console.log(`ArangoDB connection established at ${await cursor.next()}`);
  } catch (e) {
    console.log('ARANGO DB ERROR...');
    console.log(e);
  }

  return DB_HANDLE;
}
