import "reflect-metadata";
import { Database } from "arangojs";
import { DocumentCollection, EdgeCollection } from "arangojs/collection";
import { ArangoSearchView } from "arangojs/view";
import { Graph } from "arangojs/graph";

type BindVars = string | string[] | number;

export interface AqlQueryStruct {
  query: string;
  bindVars: { [key: string]: BindVars };
}

export type ArangoUnit = DocumentCollection | EdgeCollection | Graph | ArangoSearchView;

/**
 * @description values are the keys to DBStruct
 */
export enum CollType {
  NODE = "nodes",
  EDGE = "edges",
  GRAPH = "graphs",
  VIEW = "views",
}

type ArangoDocColl = {[key: string]: DocumentCollection};
type ArangoEdgeColl = {[key: string]: EdgeCollection};
type ArangoGraphs = {[key: string]: Graph};
type ArangoSearchViews = {[key: string]: ArangoSearchView};

export interface ArangoDBStruct {
  conn: Database;
  nodes: ArangoDocColl;
  edges: ArangoEdgeColl;
  graphs: ArangoGraphs;
  views: ArangoSearchViews;
}

export const emptyDB: ArangoDBStruct = {
  conn: null,
  nodes: {},
  edges: {},
  graphs: {},
  views: {},
}
