import { sampleClasses } from "@/lib/data/classes";

type FetchClassesOptions = {
  shouldFail?: boolean;
  delayMs?: number;
};

export async function fetchClasses({ delayMs = 350, shouldFail = false }: FetchClassesOptions = {}) {
  await new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });

  if (shouldFail) {
    throw new Error("Unable to load class timetable.");
  }

  return Promise.resolve(sampleClasses);
}
