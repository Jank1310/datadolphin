import env from "env-var";
import { MongoClient } from "mongodb";

let client: Promise<MongoClient>;

export const getDb = async (dbName: string) => {
  if (!client) {
    client = new MongoClient(env.get("MONGO_URL").required().asString(), {
      appName: "nextjs",
    }).connect();
  }
  return (await client).db(dbName);
};
