import { useQuery } from "@tanstack/react-query";
import { IndustryGroupClient } from "../api/industry-group.client";
import { INDUSTRY_GROUP_QUERY_KEYS } from "../constants";

const client = new IndustryGroupClient();

export function useIndustryGroupRatings(industryGroup: string | null) {
  return useQuery({
    queryKey: INDUSTRY_GROUP_QUERY_KEYS.ratings(industryGroup ?? ""),
    queryFn: () => client.getIndustryGroupRatings(industryGroup as string),
    enabled: !!industryGroup,
  });
}
