import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Heart, Users, ClipboardList, TrendingUp, Bell, Search, Settings, LogOut, 
  CheckCircle, Clock, X, AlertTriangle, Shield, FileText, Building2, 
  UserCircle, Ban, UserCheck, UserX, MoreVertical, Code, Activity 
} from "lucide-react";

interface UserRowProps {
  name: string;
  email: string;
  role: string;
  facility: string;
  status: string;
  lastActive: string;
}

function UserRow({ name, email, role, facility, status, lastActive }: UserRowProps) {
  const [showActions, setShowActions] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(status);

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "Active":
        return (
          <Badge className="bg-success/10 text-success hover:bg-success/20">
            <CheckCircle size={14} className="mr-1" />
            Active
          </Badge>
        );
      case "Suspended":
        return (
          <Badge className="bg-warning/10 text-warning hover:bg-warning/20">
            <AlertTriangle size={14} className="mr-1" />
            Suspended
          </Badge>
        );
      case "Deactivated":
        return (
          <Badge variant="destructive">
            <X size={14} className="mr-1" />
            Deactivated
          </Badge>
        );
      default:
        return null;
    }
  };

  const handleAction = (action: string) => {
    setCurrentStatus(action);
    setShowActions(false);
  };

  return (
    <tr className="border-b hover:bg-muted/50">
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold">
            {name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <p className="font-semibold text-foreground">{name}</p>
          </div>
        </div>
      </td>
      <td className="py-4 px-4 text-muted-foreground">{email}</td>
      <td className="py-4 px-4">
        <Badge variant="secondary">{role}</Badge>
      </td>
      <td className="py-4 px-4 text-muted-foreground">{facility}</td>
      <td className="py-4 px-4">{getStatusBadge(currentStatus)}</td>
      <td className="py-4 px-4 text-muted-foreground text-sm">{lastActive}</td>
      <td className="py-4 px-4">
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowActions(!showActions)}
          >
            <MoreVertical size={20} />
          </Button>
          
          {showActions && (
            <div className="absolute right-0 mt-2 w-48 bg-card rounded-lg shadow-lg border z-10">
              <button
                onClick={() => handleAction("Active")}
                disabled={currentStatus === "Active"}
                className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <UserCheck size={18} className="text-success" />
                <span>Activate</span>
              </button>
              <button
                onClick={() => handleAction("Suspended")}
                disabled={currentStatus === "Suspended"}
                className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Ban size={18} className="text-warning" />
                <span>Suspend</span>
              </button>
              <button
                onClick={() => handleAction("Deactivated")}
                disabled={currentStatus === "Deactivated"}
                className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted text-left border-t disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <UserX size={18} className="text-destructive" />
                <span>Deactivate</span>
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

const AdminDashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [notifications, setNotifications] = useState(3);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalReferrals: 0,
    totalCodes: 0,
    pendingReferrals: 0,
  });
  const [newCode, setNewCode] = useState({ code: "", role: "patient" });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [profiles, referrals, codes, pending] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("referrals").select("id", { count: "exact", head: true }),
        supabase.from("registration_codes").select("id", { count: "exact", head: true }),
        supabase.from("referrals").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);

      setStats({
        totalUsers: profiles.count || 0,
        totalReferrals: referrals.count || 0,
        totalCodes: codes.count || 0,
        pendingReferrals: pending.count || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("registration_codes").insert({
        code: newCode.code,
        role: newCode.role as "admin" | "doctor" | "nurse" | "patient",
        is_active: true,
      });

      if (error) throw error;

      toast({ title: "Registration code created successfully" });
      setNewCode({ code: "", role: "patient" });
      fetchStats();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({ title: "Logged out successfully" });
      navigate("/auth");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const dashboardStats = [
    { label: "Total Referrals", value: stats.totalReferrals.toString(), icon: ClipboardList, color: "bg-primary", change: "+12%" },
    { label: "Active Facilities", value: "89", icon: Building2, color: "bg-success", change: "+5%" },
    { label: "Healthcare Providers", value: stats.totalUsers.toString(), icon: UserCircle, color: "bg-accent", change: "+8%" },
    { label: "Pending Reviews", value: stats.pendingReferrals.toString(), icon: Clock, color: "bg-warning", change: "-3%" }
  ];

  const facilities = [
    { name: "Nairobi Hospital", type: "Private Hospital", referrals: 145, status: "Active", rating: 4.8 },
    { name: "Kenyatta Hospital", type: "Public Hospital", referrals: 289, status: "Active", rating: 4.5 },
    { name: "Aga Khan Hospital", type: "Private Hospital", referrals: 178, status: "Active", rating: 4.9 },
    { name: "Mater Hospital", type: "Private Hospital", referrals: 134, status: "Active", rating: 4.7 }
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-primary to-primary/90 text-primary-foreground flex flex-col">
        <div className="p-6 border-b border-primary-foreground/20">
          <div className="flex items-center gap-2 text-2xl font-bold">
            <Heart />
            <span>AFYALINK</span>
          </div>
          <p className="text-primary-foreground/70 text-sm mt-1">Admin Portal</p>
        </div>

        <nav className="flex-1 p-4">
          <Button
            variant={activeTab === "overview" ? "secondary" : "ghost"}
            className="w-full justify-start gap-3 mb-2"
            onClick={() => setActiveTab("overview")}
          >
            <TrendingUp size={20} /> Overview
          </Button>
          <Button
            variant={activeTab === "referrals" ? "secondary" : "ghost"}
            className="w-full justify-start gap-3 mb-2"
            onClick={() => setActiveTab("referrals")}
          >
            <ClipboardList size={20} /> Referrals
          </Button>
          <Button
            variant={activeTab === "facilities" ? "secondary" : "ghost"}
            className="w-full justify-start gap-3 mb-2"
            onClick={() => setActiveTab("facilities")}
          >
            <Building2 size={20} /> Facilities
          </Button>
          <Button
            variant={activeTab === "providers" ? "secondary" : "ghost"}
            className="w-full justify-start gap-3 mb-2"
            onClick={() => setActiveTab("providers")}
          >
            <UserCircle size={20} /> Providers
          </Button>
          <Button
            variant={activeTab === "users" ? "secondary" : "ghost"}
            className="w-full justify-start gap-3 mb-2"
            onClick={() => setActiveTab("users")}
          >
            <Users size={20} /> Users
          </Button>
          <Button
            variant={activeTab === "codes" ? "secondary" : "ghost"}
            className="w-full justify-start gap-3 mb-2"
            onClick={() => setActiveTab("codes")}
          >
            <Code size={20} /> Registration Codes
          </Button>
          <Button
            variant={activeTab === "analytics" ? "secondary" : "ghost"}
            className="w-full justify-start gap-3 mb-2"
            onClick={() => setActiveTab("analytics")}
          >
            <FileText size={20} /> Analytics & Reports
          </Button>
          <Button
            variant={activeTab === "security" ? "secondary" : "ghost"}
            className="w-full justify-start gap-3 mb-2"
            onClick={() => setActiveTab("security")}
          >
            <Shield size={20} /> Security & Audit
          </Button>
          
          <div className="my-4 border-t border-primary-foreground/20" />
          
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 mb-2"
            onClick={() => navigate("/reports")}
          >
            <FileText size={20} /> Reports
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 mb-2"
            onClick={() => navigate("/faq")}
          >
            <FileText size={20} /> FAQ
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 mb-2"
            onClick={() => navigate("/feedback")}
          >
            <Bell size={20} /> Feedback
          </Button>
        </nav>

        <div className="p-4 border-t border-primary-foreground/20">
          <Button variant="ghost" className="w-full justify-start gap-3 mb-2" onClick={() => navigate("/")}>
            <Settings size={20} /> Settings
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 text-destructive" onClick={handleLogout}>
            <LogOut size={20} /> Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="bg-card shadow-sm px-8 py-4 flex items-center justify-between border-b">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
              <Input
                type="text"
                placeholder="Search referrals, facilities, providers..."
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button className="relative">
              <Bell className="text-muted-foreground" size={24} />
              {notifications > 0 && (
                <Badge className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground w-5 h-5 flex items-center justify-center p-0 rounded-full">
                  {notifications}
                </Badge>
              )}
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
                AD
              </div>
              <div>
                <p className="font-semibold text-foreground">Admin User</p>
                <p className="text-xs text-muted-foreground">admin@afyalink.com</p>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          {activeTab === "overview" && (
            <>
              <h1 className="text-3xl font-bold mb-6">Dashboard Overview</h1>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {dashboardStats.map((stat, index) => (
                  <div key={index} className="bg-card rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`${stat.color} p-3 rounded-lg text-primary-foreground`}>
                        <stat.icon size={24} />
                      </div>
                      <span className="text-success font-semibold text-sm">{stat.change}</span>
                    </div>
                    <p className="text-muted-foreground text-sm mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold">{stat.value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-card rounded-xl shadow-sm p-6 border">
                <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
                <p className="text-muted-foreground">Recent referrals and activity will be displayed here...</p>
              </div>
            </>
          )}

          {activeTab === "referrals" && (
            <div>
              <h1 className="text-3xl font-bold mb-6">Referral Management</h1>
              
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>All Referrals</CardTitle>
                    <Select>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="accepted">Accepted</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>All referrals from the system will be displayed here</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "facilities" && (
            <div>
              <h1 className="text-3xl font-bold mb-6">Facility Management</h1>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Facilities</p>
                        <p className="text-3xl font-bold">{facilities.length}</p>
                      </div>
                      <Building2 className="h-8 w-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Active Facilities</p>
                        <p className="text-3xl font-bold text-success">
                          {facilities.filter(f => f.status === "Active").length}
                        </p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-success" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Rating</p>
                        <p className="text-3xl font-bold">4.7</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {facilities.map((facility, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Building2 className="text-primary" size={24} />
                          </div>
                          <div>
                            <p className="font-semibold">{facility.name}</p>
                            <p className="text-sm text-muted-foreground">{facility.type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-8">
                          <div className="text-right">
                            <p className="text-2xl font-bold">{facility.referrals}</p>
                            <p className="text-sm text-muted-foreground">Referrals</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold">{facility.rating}</p>
                            <p className="text-sm text-muted-foreground">Rating</p>
                          </div>
                          <Badge className="bg-success">{facility.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "providers" && (
            <div>
              <h1 className="text-3xl font-bold mb-6">Healthcare Providers</h1>
              
              <Tabs defaultValue="doctors" className="space-y-6">
                <TabsList>
                  <TabsTrigger value="doctors">Doctors</TabsTrigger>
                  <TabsTrigger value="nurses">Nurses</TabsTrigger>
                </TabsList>
                
                <TabsContent value="doctors">
                  <Card>
                    <CardHeader>
                      <CardTitle>Registered Doctors</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {[
                          { name: "Dr. Jane Kamau", specialty: "Cardiology", facility: "Nairobi Hospital", patients: 45 },
                          { name: "Dr. Michael Ochieng", specialty: "Neurology", facility: "Kenyatta Hospital", patients: 38 },
                          { name: "Dr. Grace Njeri", specialty: "Pediatrics", facility: "Aga Khan Hospital", patients: 52 },
                        ].map((doctor, i) => (
                          <div key={i} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                <UserCircle className="text-primary" size={24} />
                              </div>
                              <div>
                                <p className="font-semibold">{doctor.name}</p>
                                <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <p className="font-semibold">{doctor.facility}</p>
                                <p className="text-sm text-muted-foreground">{doctor.patients} patients</p>
                              </div>
                              <Badge>Active</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="nurses">
                  <Card>
                    <CardHeader>
                      <CardTitle>Registered Nurses</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {[
                          { name: "Nurse Sarah Wanjiru", department: "Emergency", facility: "Mater Hospital", assigned: 12 },
                          { name: "Nurse David Kipchoge", department: "ICU", facility: "Nairobi Hospital", assigned: 8 },
                        ].map((nurse, i) => (
                          <div key={i} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                <UserCircle className="text-primary" size={24} />
                              </div>
                              <div>
                                <p className="font-semibold">{nurse.name}</p>
                                <p className="text-sm text-muted-foreground">{nurse.department}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <p className="font-semibold">{nurse.facility}</p>
                                <p className="text-sm text-muted-foreground">{nurse.assigned} assigned</p>
                              </div>
                              <Badge>Active</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {activeTab === "users" && (
            <>
              <h1 className="text-3xl font-bold mb-6">User Management</h1>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Users</p>
                        <p className="text-3xl font-bold">458</p>
                      </div>
                      <Users className="h-8 w-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Active Users</p>
                        <p className="text-3xl font-bold text-success">412</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-success" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Suspended</p>
                        <p className="text-3xl font-bold text-warning">31</p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-warning" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Deactivated</p>
                        <p className="text-3xl font-bold text-destructive">15</p>
                      </div>
                      <X className="h-8 w-8 text-destructive" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>All Users</CardTitle>
                    <div className="flex gap-3">
                      <Input placeholder="Search users..." className="w-64" />
                      <Select>
                        <SelectTrigger className="w-[150px]">
                          <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-semibold">User</th>
                          <th className="text-left py-3 px-4 font-semibold">Email</th>
                          <th className="text-left py-3 px-4 font-semibold">Role</th>
                          <th className="text-left py-3 px-4 font-semibold">Facility</th>
                          <th className="text-left py-3 px-4 font-semibold">Status</th>
                          <th className="text-left py-3 px-4 font-semibold">Last Active</th>
                          <th className="text-left py-3 px-4 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <UserRow
                          name="Dr. Jane Kamau"
                          email="jane.kamau@nairobi.hospital"
                          role="Doctor"
                          facility="Nairobi Hospital"
                          status="Active"
                          lastActive="2 hours ago"
                        />
                        <UserRow
                          name="Nurse Sarah Wanjiru"
                          email="s.wanjiru@agakhan.com"
                          role="Nurse"
                          facility="Aga Khan Hospital"
                          status="Suspended"
                          lastActive="5 days ago"
                        />
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === "codes" && (
            <>
              <h1 className="text-3xl font-bold mb-6">Registration Codes</h1>
              
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-primary p-3 rounded-lg text-primary-foreground">
                        <Users size={24} />
                      </div>
                    </div>
                    <p className="text-muted-foreground text-sm mb-1">Total Users</p>
                    <p className="text-3xl font-bold">{stats.totalUsers}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-primary p-3 rounded-lg text-primary-foreground">
                        <ClipboardList size={24} />
                      </div>
                    </div>
                    <p className="text-muted-foreground text-sm mb-1">Total Referrals</p>
                    <p className="text-3xl font-bold">{stats.totalReferrals}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-primary p-3 rounded-lg text-primary-foreground">
                        <Code size={24} />
                      </div>
                    </div>
                    <p className="text-muted-foreground text-sm mb-1">Registration Codes</p>
                    <p className="text-3xl font-bold">{stats.totalCodes}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-warning p-3 rounded-lg text-primary-foreground">
                        <Activity size={24} />
                      </div>
                    </div>
                    <p className="text-muted-foreground text-sm mb-1">Pending Referrals</p>
                    <p className="text-3xl font-bold">{stats.pendingReferrals}</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Create Registration Code</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateCode} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="code">Code</Label>
                        <Input
                          id="code"
                          placeholder="DOCTOR2025"
                          value={newCode.code}
                          onChange={(e) => setNewCode({ ...newCode, code: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Select
                          value={newCode.role}
                          onValueChange={(value) => setNewCode({ ...newCode, role: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="doctor">Doctor</SelectItem>
                            <SelectItem value="nurse">Nurse</SelectItem>
                            <SelectItem value="patient">Patient</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button type="submit">Create Code</Button>
                  </form>
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === "analytics" && (
            <div>
              <h1 className="text-3xl font-bold mb-6">Analytics & Reports</h1>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Referral Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">This Month</span>
                        <span className="font-semibold">247 referrals</span>
                      </div>
                      <div className="w-full bg-muted h-2 rounded-full">
                        <div className="bg-primary h-2 rounded-full" style={{ width: "75%" }}></div>
                      </div>
                      <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <span>Last Month: 198</span>
                        <span className="text-success">+24.7%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top Specialties</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        { name: "Cardiology", count: 89, percent: 35 },
                        { name: "Orthopedics", count: 67, percent: 27 },
                        { name: "Neurology", count: 54, percent: 22 },
                      ].map((specialty, i) => (
                        <div key={i}>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">{specialty.name}</span>
                            <span className="text-sm font-semibold">{specialty.count}</span>
                          </div>
                          <div className="w-full bg-muted h-2 rounded-full">
                            <div className="bg-primary h-2 rounded-full" style={{ width: `${specialty.percent}%` }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Average Processing Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-4">
                      <p className="text-5xl font-bold text-primary">2.3</p>
                      <p className="text-muted-foreground mt-2">days average</p>
                      <p className="text-sm text-success mt-1">-15% from last month</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Success Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-4">
                      <p className="text-5xl font-bold text-success">94.2%</p>
                      <p className="text-muted-foreground mt-2">completed referrals</p>
                      <p className="text-sm text-success mt-1">+2.1% improvement</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Export Reports</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button variant="outline" className="justify-start">
                      <FileText className="mr-2 h-4 w-4" />
                      Monthly Summary
                    </Button>
                    <Button variant="outline" className="justify-start">
                      <FileText className="mr-2 h-4 w-4" />
                      Facility Performance
                    </Button>
                    <Button variant="outline" className="justify-start">
                      <FileText className="mr-2 h-4 w-4" />
                      Provider Activity
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "security" && (
            <div>
              <h1 className="text-3xl font-bold mb-6">Security & Audit</h1>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Active Sessions</p>
                        <p className="text-3xl font-bold">127</p>
                      </div>
                      <Users className="h-8 w-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Failed Logins (24h)</p>
                        <p className="text-3xl font-bold text-warning">8</p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-warning" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Security Score</p>
                        <p className="text-3xl font-bold text-success">98%</p>
                      </div>
                      <Shield className="h-8 w-8 text-success" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Recent Audit Logs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { action: "User Login", user: "admin@afyalink.com", time: "2 minutes ago", type: "success" },
                      { action: "Referral Created", user: "doctor@nairobi.hospital", time: "15 minutes ago", type: "info" },
                      { action: "Failed Login Attempt", user: "unknown@example.com", time: "1 hour ago", type: "warning" },
                    ].map((log, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            log.type === "success" ? "bg-success" :
                            log.type === "warning" ? "bg-warning" :
                            "bg-primary"
                          }`}></div>
                          <div>
                            <p className="font-semibold text-sm">{log.action}</p>
                            <p className="text-xs text-muted-foreground">{log.user}</p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">{log.time}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                      <div>
                        <p className="font-semibold">Two-Factor Authentication</p>
                        <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                      </div>
                      <Badge className="bg-success">Enabled</Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                      <div>
                        <p className="font-semibold">Session Timeout</p>
                        <p className="text-sm text-muted-foreground">Automatic logout after inactivity</p>
                      </div>
                      <span className="text-sm font-semibold">30 minutes</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;