import { queryOptions } from "@tanstack/react-query";
import { getProperty, listProperties } from "./api.functions";

export const propertiesQuery = queryOptions({ queryKey: ["properties"], queryFn: () => listProperties() });
export const propertyQuery = (id: string) =>
  queryOptions({ queryKey: ["property", id], queryFn: () => getProperty({ data: { id } }) });
