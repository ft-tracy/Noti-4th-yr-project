import { createFileRoute, Navigate } from "@tanstack/react-router";
import { dashboardPathFor, useNoti } from "@/lib/noti/store";

export const Route = createFileRoute("/dashboard/")({ component: DashboardHome });

function DashboardHome() {
  const { user } = useNoti();
  if (!user) return null;
  return <Navigate to={dashboardPathFor(user.role)} replace />;
}
