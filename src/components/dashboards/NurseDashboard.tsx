import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "./DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FileText, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const NurseDashboard = () => {
  const { toast } = useToast();
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
          patient:profiles!patient_id(full_name, email),
          referring_doctor:profiles!referring_doctor_id(full_name)
        `)
        .or(`assigned_nurse_id.eq.${session.user.id},assigned_nurse_id.is.null`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReferrals(data || []);
    } catch (error) {
      console.error("Error fetching referrals:", error);
    }
  };

  const handleUpdateStatus = async (referralId: string, newStatus: "pending" | "accepted" | "in_progress" | "completed" | "rejected") => {
    try {
      const { error } = await supabase
        .from("referrals")
        .update({ status: newStatus })
        .eq("id", referralId);

      if (error) throw error;

      toast({ title: "Referral status updated" });
      fetchReferrals();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAssignToMe = async (referralId: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from("referrals")
        .update({ assigned_nurse_id: session.user.id })
        .eq("id", referralId);

      if (error) throw error;

      toast({ title: "Referral assigned to you" });
      fetchReferrals();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
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

  return (
    <DashboardLayout title="Nurse Dashboard" role="Nurse">
      <div className="mb-6">
        <p className="text-muted-foreground">Monitor and manage patient referrals</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Active Referrals
        </h3>
        {referrals.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No referrals to manage at the moment.</p>
            </CardContent>
          </Card>
        ) : (
          referrals.map((referral) => (
            <Card key={referral.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {referral.patient?.full_name || "Unknown Patient"}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Badge className={getUrgencyColor(referral.urgency)}>
                      {referral.urgency}
                    </Badge>
                    <Badge variant="outline">{referral.status}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 text-sm">
                  <div>
                    <span className="font-semibold">Referring Doctor:</span>{" "}
                    {referral.referring_doctor?.full_name || "Unknown"}
                  </div>
                  <div>
                    <span className="font-semibold">From:</span> {referral.facility_from}
                  </div>
                  <div>
                    <span className="font-semibold">To:</span> {referral.facility_to}
                  </div>
                  <div>
                    <span className="font-semibold">Reason:</span> {referral.reason}
                  </div>
                  {referral.diagnosis && (
                    <div>
                      <span className="font-semibold">Diagnosis:</span> {referral.diagnosis}
                    </div>
                  )}
                  <div className="text-muted-foreground">
                    Created: {new Date(referral.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {!referral.assigned_nurse_id && (
                    <Button size="sm" onClick={() => handleAssignToMe(referral.id)}>
                      Assign to Me
                    </Button>
                  )}
                  {referral.assigned_nurse_id && (
                    <div className="flex gap-2 items-center">
                      <span className="text-sm">Update Status:</span>
                      <Select
                        value={referral.status}
                        onValueChange={(value: "pending" | "accepted" | "in_progress" | "completed" | "rejected") => handleUpdateStatus(referral.id, value)}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="accepted">Accepted</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </DashboardLayout>
  );
};

export default NurseDashboard;