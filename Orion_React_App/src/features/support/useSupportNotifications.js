import { useQuery } from "@tanstack/react-query";
import { SUBJECTS } from "../../constants/routes";
import { useAuth } from "../auth/authContext";
import { fetchSupportNotifications, supportNotificationsQueryKey } from "./queries";

const refreshMilliseconds = 30000;

// In-app notification counts for the signed-in person. Counts only: no ticket text or category.
export function useSupportNotifications() {
  const { ability, profile, status } = useAuth();
  const enabled = status === "signedIn" && Boolean(profile?.id) && ability.can("visit", SUBJECTS.SUPPORT);
  const query = useQuery({
    queryKey: supportNotificationsQueryKey(profile?.id),
    queryFn: fetchSupportNotifications,
    enabled,
    refetchInterval: refreshMilliseconds,
    refetchOnWindowFocus: true,
  });
  // The database counts each ticket once, even when it is both unread and unassigned.
  return {
    unread: query.data?.unreadTickets ?? 0,
    unassigned: profile?.role === "admin" ? query.data?.unassignedTickets ?? 0 : 0,
    total: query.data?.attentionTickets ?? 0,
  };
}
