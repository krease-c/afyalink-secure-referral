import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "./DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const PatientDashboard = () => {
  const [referrals, setReferrals] = useState<any[]>([]);

  useEffect(() => {
    fetchReferrals();
  }, []);

  const fetchReferrals = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("referrals")
        .select(`
          *,
          referring_doctor:profiles!referring_doctor_id(full_name),
          assigned_doctor:profiles!assigned_doctor_id(full_name),
          assigned_nurse:profiles!assigned_nurse_id(full_name)
        `)
        .eq("patient_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReferrals(data || []);
    } catch (error) {
      console.error("Error fetching referrals:", error);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "critical":
        return "bg-destructive";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-green-500";
      default:
        return "bg-muted";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "in_progress":
        return "bg-blue-500";
      case "accepted":
        return "bg-cyan-500";
      case "rejected":
        return "bg-destructive";
      default:
        return "bg-muted";
    }
  };

  return (
    <DashboardLayout title="Patient Dashboard" role="Patient">
      <div className="mb-6">
        <p className="text-muted-foreground">View your medical referrals</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Your Referrals</h3>
        {referrals.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No referrals found. Your doctor will create referrals when needed.</p>
            </CardContent>
          </Card>
        ) : (
          referrals.map((referral) => (
            <Card key={referral.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Referral to {referral.facility_to}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Badge className={getUrgencyColor(referral.urgency)}>
                      {referral.urgency}
                    </Badge>
                    <Badge className={getStatusColor(referral.status)}>
                      {referral.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="font-semibold">Referring Doctor:</span>
                      <p>{referral.referring_doctor?.full_name || "Unknown"}</p>
                    </div>
                    {referral.assigned_doctor && (
                      <div>
                        <span className="font-semibold">Assigned Doctor:</span>
                        <p>{referral.assigned_doctor.full_name}</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="font-semibold">From Facility:</span>
                      <p>{referral.facility_from}</p>
                    </div>
                    <div>
                      <span className="font-semibold">To Facility:</span>
                      <p>{referral.facility_to}</p>
                    </div>
                  </div>

                  <div>
                    <span className="font-semibold">Reason for Referral:</span>
                    <p>{referral.reason}</p>
                  </div>

                  {referral.diagnosis && (
                    <div>
                      <span className="font-semibold">Diagnosis:</span>
                      <p>{referral.diagnosis}</p>
                    </div>
                  )}

                  {referral.notes && (
                    <div>
                      <span className="font-semibold">Notes:</span>
                      <p>{referral.notes}</p>
                    </div>
                  )}

                  {referral.assigned_nurse && (
                    <div>
                      <span className="font-semibold">Assigned Nurse:</span>
                      <p>{referral.assigned_nurse.full_name}</p>
                    </div>
                  )}

                  <div className="text-muted-foreground text-xs pt-2 border-t">
                    <div>Created: {new Date(referral.created_at).toLocaleString()}</div>
                    <div>Last Updated: {new Date(referral.updated_at).toLocaleString()}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </DashboardLayout>
  );
};

export default PatientDashboard;