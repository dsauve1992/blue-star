import { useQuery } from "@tanstack/react-query";
import { IndustryGroupClient } from "../api/industry-group.client";
import { INDUSTRY_GROUP_QUERY_KEYS } from "../constants";

const client = new IndustryGroupClient();

export function useIndustryGroups() {
  return useQuery({
    queryKey: INDUSTRY_GROUP_QUERY_KEYS.lists(),
    queryFn: () => client.listIndustryGroups(),
  });
}
