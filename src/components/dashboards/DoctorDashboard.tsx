import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "./DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const DoctorDashboard = () => {
  const { toast } = useToast();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newReferral, setNewReferral] = useState({
    patientEmail: "",
    facilityFrom: "",
    facilityTo: "",
    reason: "",
    diagnosis: "",
    urgency: "medium",
  });

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
        .select("*, patient:profiles!patient_id(full_name, email)")
        .or(`referring_doctor_id.eq.${session.user.id},assigned_doctor_id.eq.${session.user.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReferrals(data || []);
    } catch (error) {
      console.error("Error fetching referrals:", error);
    }
  };

  const handleCreateReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      // Find patient by email
      const { data: patientData, error: patientError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", newReferral.patientEmail)
        .single();

      if (patientError || !patientData) {
        toast({
          title: "Error",
          description: "Patient not found with this email",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("referrals").insert({
        patient_id: patientData.id,
        referring_doctor_id: session.user.id,
        facility_from: newReferral.facilityFrom,
        facility_to: newReferral.facilityTo,
        reason: newReferral.reason,
        diagnosis: newReferral.diagnosis,
        urgency: newReferral.urgency,
        status: "pending",
      });

      if (error) throw error;

      toast({ title: "Referral created successfully" });
      setShowForm(false);
      setNewReferral({
        patientEmail: "",
        facilityFrom: "",
        facilityTo: "",
        reason: "",
        diagnosis: "",
        urgency: "medium",
      });
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
    <DashboardLayout title="Doctor Dashboard" role="Doctor">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <p className="text-muted-foreground">Manage patient referrals</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          {showForm ? "Cancel" : "New Referral"}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New Referral</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateReferral} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="patientEmail">Patient Email</Label>
                  <Input
                    id="patientEmail"
                    type="email"
                    placeholder="patient@example.com"
                    value={newReferral.patientEmail}
                    onChange={(e) => setNewReferral({ ...newReferral, patientEmail: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="urgency">Urgency</Label>
                  <Select
                    value={newReferral.urgency}
                    onValueChange={(value) => setNewReferral({ ...newReferral, urgency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facilityFrom">From Facility</Label>
                  <Input
                    id="facilityFrom"
                    value={newReferral.facilityFrom}
                    onChange={(e) => setNewReferral({ ...newReferral, facilityFrom: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facilityTo">To Facility</Label>
                  <Input
                    id="facilityTo"
                    value={newReferral.facilityTo}
                    onChange={(e) => setNewReferral({ ...newReferral, facilityTo: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Referral</Label>
                <Textarea
                  id="reason"
                  value={newReferral.reason}
                  onChange={(e) => setNewReferral({ ...newReferral, reason: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="diagnosis">Diagnosis</Label>
                <Textarea
                  id="diagnosis"
                  value={newReferral.diagnosis}
                  onChange={(e) => setNewReferral({ ...newReferral, diagnosis: e.target.value })}
                />
              </div>
              <Button type="submit">Create Referral</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Your Referrals</h3>
        {referrals.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No referrals yet. Create your first referral to get started.</p>
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
              <CardContent>
                <div className="grid gap-2 text-sm">
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
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </DashboardLayout>
  );
};

export default DoctorDashboard;