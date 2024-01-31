import env from "env-var";
import { MongoClient } from "mongodb";
const client = new MongoClient(env.get("MONGO_URL").required().asString(), {
  appName: "nextjs",
}).connect();

export const getDb = async (dbName: string) => {
  return (await client).db(dbName);
};
