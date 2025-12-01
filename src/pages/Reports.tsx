import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, ArrowLeft, Download, Calendar, Filter, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const Reports = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    reportType: "referrals",
    status: "all",
  });

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

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      setUserRoles(data?.map((r) => r.role) || []);
    } catch (error) {
      console.error("Error fetching user roles:", error);
    }
  };

  const handleGenerateReport = async () => {
    if (!filters.startDate || !filters.endDate) {
      toast({
        title: "Error",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Fetch data based on report type
      let query = supabase
        .from("referrals")
        .select("*")
        .gte("created_at", filters.startDate)
        .lte("created_at", filters.endDate);

      if (filters.status !== "all") {
        query = query.eq("status", filters.status as any);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Generate report content
      const reportContent = generateReportContent(data || [], filters);

      // Create downloadable file
      const blob = new Blob([reportContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `AFYALINK_Report_${filters.reportType}_${new Date().toISOString().split("T")[0]}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Success",
        description: "Report generated successfully!",
      });
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateReportContent = (data: any[], filters: any) => {
    const now = new Date();
    let content = `AFYALINK E-REFERRAL SYSTEM\n`;
    content += `${filters.reportType.toUpperCase()} REPORT\n`;
    content += `Generated: ${now.toLocaleString()}\n`;
    content += `Period: ${filters.startDate} to ${filters.endDate}\n`;
    content += `Status Filter: ${filters.status}\n`;
    content += `\n${"=".repeat(60)}\n\n`;

    content += `SUMMARY\n`;
    content += `Total Records: ${data.length}\n\n`;

    if (data.length > 0) {
      content += `DETAILED RECORDS\n`;
      content += `${"=".repeat(60)}\n\n`;

      data.forEach((record, index) => {
        content += `Record ${index + 1}\n`;
        content += `ID: ${record.id}\n`;
        content += `Status: ${record.status}\n`;
        content += `Facility From: ${record.facility_from}\n`;
        content += `Facility To: ${record.facility_to}\n`;
        content += `Urgency: ${record.urgency}\n`;
        content += `Reason: ${record.reason}\n`;
        content += `Created: ${new Date(record.created_at).toLocaleString()}\n`;
        content += `\n${"-".repeat(40)}\n\n`;
      });
    }

    return content;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Heart className="text-primary" size={32} />
                <span className="text-2xl font-bold text-foreground">AFYALINK</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">Reports & Analytics</h1>
          <p className="text-muted-foreground text-lg">
            Generate and export reports for your referral activities
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Generate Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) =>
                    setFilters({ ...filters, startDate: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) =>
                    setFilters({ ...filters, endDate: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="reportType">Report Type</Label>
              <Select
                value={filters.reportType}
                onValueChange={(value) =>
                  setFilters({ ...filters, reportType: value })
                }
              >
                <SelectTrigger id="reportType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="referrals">Referrals Report</SelectItem>
                  {userRoles.includes("admin") && (
                    <>
                      <SelectItem value="facilities">Facilities Report</SelectItem>
                      <SelectItem value="staff">Medical Staff Report</SelectItem>
                      <SelectItem value="users">Users Report</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status Filter</Label>
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  setFilters({ ...filters, status: value })
                }
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleGenerateReport}
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background"></div>
                  Generating...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Download size={18} />
                  Generate & Download Report
                </div>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        {userRoles.includes("admin") && (
          <div className="mt-8 grid md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-muted-foreground text-sm mb-1">Total Referrals</p>
                  <p className="text-3xl font-bold text-foreground">-</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-muted-foreground text-sm mb-1">Active Facilities</p>
                  <p className="text-3xl font-bold text-foreground">-</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-muted-foreground text-sm mb-1">Medical Staff</p>
                  <p className="text-3xl font-bold text-foreground">-</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default Reports;
