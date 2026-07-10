"use client";

import { useCallback, useEffect, useState } from "react";

type AsyncDataState<T> = {
  data: T;
  error: string | null;
  isLoading: boolean;
  reload: () => void;
};

function getDefaultErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to load data.";
}

export function useAsyncData<T>(loadData: () => Promise<T>, initialData: T): AsyncDataState<T> {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadIndex, setReloadIndex] = useState(0);

  const reload = useCallback(() => {
    setReloadIndex((current) => current + 1);
  }, []);

  useEffect(() => {
    let isCurrentRequest = true;

    async function load() {
      setIsLoading(true);

      try {
        const nextData = await loadData();

        if (!isCurrentRequest) {
          return;
        }

        setData(nextData);
        setError(null);
      } catch (loadError) {
        if (!isCurrentRequest) {
          return;
        }

        setData(initialData);
        setError(getDefaultErrorMessage(loadError));
      } finally {
        if (isCurrentRequest) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      isCurrentRequest = false;
    };
  }, [initialData, loadData, reloadIndex]);

  return {
    data,
    error,
    isLoading,
    reload
  };
}
