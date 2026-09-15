import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import { listCatalog } from "@/lib/catalog.functions";

export interface CatalogDepartment {
  id: string;
  key: string;
  label: string;
  semester_count: number;
  sort_order: number;
}
export interface CatalogSubject {
  id: string;
  department_id: string;
  name: string;
  credit_hours: number;
  sort_order: number;
}

export function useCatalog() {
  const fn = useServerFn(listCatalog);
  const q = useQuery({
    queryKey: ["catalog"],
    queryFn: () => fn(),
    staleTime: 30_000,
  });

  const departments = (q.data?.departments ?? []) as CatalogDepartment[];
  const subjects = (q.data?.subjects ?? []) as CatalogSubject[];

  const byDeptKey = useMemo(() => {
    const map = new Map<string, CatalogSubject[]>();
    const idToKey = new Map(departments.map((d) => [d.id, d.key]));
    for (const s of subjects) {
      const k = idToKey.get(s.department_id);
      if (!k) continue;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(s);
    }
    return map;
  }, [departments, subjects]);

  return {
    ...q,
    departments,
    subjects,
    subjectsForDeptKey: (key: string) => byDeptKey.get(key) ?? [],
    labelForKey: (key: string) => departments.find((d) => d.key === key)?.label ?? key,
    semestersForKey: (key: string) => departments.find((d) => d.key === key)?.semester_count ?? 8,
  };
}
