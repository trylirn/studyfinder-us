import { queryOptions } from "@tanstack/react-query";
import { listClinics, listConditions, listRecruiting, listSponsors, listStates } from "@/lib/directory.functions";

export const conditionsQuery = (q: string, page: number) =>
  queryOptions({
    queryKey: ["conditions", q, page] as const,
    queryFn: () => listConditions({ data: { q, page } }),
  });

export const sponsorsQuery = (q: string, page: number) =>
  queryOptions({
    queryKey: ["sponsors", q, page] as const,
    queryFn: () => listSponsors({ data: { q, page } }),
  });

export const statesQuery = (q: string) =>
  queryOptions({
    queryKey: ["states", q] as const,
    queryFn: () => listStates({ data: { q } }),
  });

export const recruitingQuery = (q: string, state: string, phase: string, page: number) =>
  queryOptions({
    queryKey: ["recruiting", q, state, phase, page] as const,
    queryFn: () => listRecruiting({ data: { q, state, phase, page } }),
  });

export const clinicsQuery = (q: string, state: string, page: number) =>
  queryOptions({
    queryKey: ["clinics", q, state, page] as const,
    queryFn: () => listClinics({ data: { q, state, page } }),
  });