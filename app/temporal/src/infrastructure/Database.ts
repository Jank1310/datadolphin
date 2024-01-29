import { MongoClient } from "mongodb";

export class Database {
  constructor(public mongoClient: MongoClient) {}
}
