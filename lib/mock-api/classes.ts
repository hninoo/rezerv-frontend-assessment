import { sampleClasses, type FitnessClass } from "@/lib/data/classes";
import type { MockRequestOptions, MockResourceApi } from "./types";
import { wait } from "./wait";

type FetchClassesOptions = MockRequestOptions;

export type ClassApi = MockResourceApi<FetchClassesOptions, FitnessClass>;

export async function fetchClasses({ delayMs = 350, shouldFail = false }: FetchClassesOptions = {}) {
  await wait(delayMs);

  if (shouldFail) {
    throw new Error("Unable to load class timetable.");
  }

  return sampleClasses;
}

export const classApi: ClassApi = {
  list: async (options = {}) => {
    const rows = await fetchClasses(options);

    return { rows, totalRows: rows.length };
  }
};
