import { useQuery } from "@tanstack/react-query";
import { getMarketStats } from "@/actions/get-market-stats";

export const marketQueryKeys = {
	marketStats: ["market-stats"] as const,
};

export const useMarketStats = () => {
	return useQuery({
		queryKey: marketQueryKeys.marketStats,
		queryFn: getMarketStats,
		staleTime: 30 * 1000, // 30 seconds
		refetchInterval: 60 * 1000, // Refetch every minute
	});
};
