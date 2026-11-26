import { useQuery } from "@tanstack/react-query";
import { PotentScanClient } from "../api/potent-scan.client";
import { POTENT_SCAN_QUERY_KEYS } from "../constants/query-keys";

const client = new PotentScanClient();

export function usePotentScanDates() {
  return useQuery({
    queryKey: POTENT_SCAN_QUERY_KEYS.scanDates(),
    queryFn: () => client.listScanDates(),
  });
}
