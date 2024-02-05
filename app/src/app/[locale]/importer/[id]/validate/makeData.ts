import { faker } from "@faker-js/faker";
import { times } from "lodash";

export function makeData() {
  const data = times(5000, () => {
    return {
      email: faker.internet.email(),
      "work role": faker.person.jobType(),
    };
  });
  return data;
}
