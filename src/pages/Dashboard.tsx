import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminDashboard from "@/components/dashboards/AdminDashboard";
import DoctorDashboard from "@/components/dashboards/DoctorDashboard";
import NurseDashboard from "@/components/dashboards/NurseDashboard";
import PatientDashboard from "@/components/dashboards/PatientDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Mail } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [userStatus, setUserStatus] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        navigate("/auth");
        return;
      }

      setUserEmail(session.user.email || "");

      // Fetch profile status
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("status")
        .eq("id", session.user.id)
        .single();

      if (profileError) throw profileError;
      setUserStatus(profile?.status || "pending");

      // Only fetch roles if user is active
      if (profile?.status === "active") {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id);

        if (error) throw error;

        const roles = data?.map((r) => r.role) || [];
        setUserRoles(roles);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show pending approval message if user is not active
  if (userStatus !== "active") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center">
              <Clock className="h-8 w-8 text-warning" />
            </div>
            <CardTitle className="text-2xl">Account Pending Approval</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Your account is currently awaiting approval from an administrator. 
              You will be able to access the system once your account has been activated.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted p-3 rounded-lg">
              <Mail className="h-4 w-4" />
              <span>{userEmail}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Please check back later or contact the administrator if you need immediate access.
            </p>
            <Button variant="outline" onClick={handleLogout} className="w-full">
              Sign Out
            </Button>
          </CardContent>
        </Card>
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