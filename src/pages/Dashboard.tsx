import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminDashboard from "@/components/dashboards/AdminDashboard";
import DoctorDashboard from "@/components/dashboards/DoctorDashboard";
import NurseDashboard from "@/components/dashboards/NurseDashboard";
import PatientDashboard from "@/components/dashboards/PatientDashboard";

const Dashboard = () => {
  const navigate = useNavigate();
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserRoles();
  }, []);

  const fetchUserRoles = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      if (error) throw error;

      const roles = data?.map((r) => r.role) || [];
      setUserRoles(roles);
    } catch (error) {
      console.error("Error fetching user roles:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Render dashboard based on highest priority role
  if (userRoles.includes("admin")) {
    return <AdminDashboard />;
  } else if (userRoles.includes("doctor")) {
    return <DoctorDashboard />;
  } else if (userRoles.includes("nurse")) {
    return <NurseDashboard />;
  } else if (userRoles.includes("patient")) {
    return <PatientDashboard />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">No Role Assigned</h2>
        <p className="text-muted-foreground">
          Please contact an administrator to assign you a role.
        </p>
      </div>
    </div>
  );
};

export default Dashboard;