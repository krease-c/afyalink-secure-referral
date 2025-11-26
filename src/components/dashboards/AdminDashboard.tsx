import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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

              {/* Stats Grid */}
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

              {/* Recent Activity Placeholder */}
              <div className="bg-card rounded-xl shadow-sm p-6 border">
                <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
                <p className="text-muted-foreground">Recent referrals and activity will be displayed here...</p>
              </div>
            </>
          )}

          {activeTab === "codes" && (
            <>
              <h1 className="text-3xl font-bold mb-6">Registration Codes</h1>
              
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
                <div className="bg-card rounded-xl p-6 shadow-sm border">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-primary p-3 rounded-lg text-primary-foreground">
                      <Users size={24} />
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm mb-1">Total Users</p>
                  <p className="text-3xl font-bold">{stats.totalUsers}</p>
                </div>

                <div className="bg-card rounded-xl p-6 shadow-sm border">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-primary p-3 rounded-lg text-primary-foreground">
                      <ClipboardList size={24} />
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm mb-1">Total Referrals</p>
                  <p className="text-3xl font-bold">{stats.totalReferrals}</p>
                </div>

                <div className="bg-card rounded-xl p-6 shadow-sm border">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-primary p-3 rounded-lg text-primary-foreground">
                      <Code size={24} />
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm mb-1">Registration Codes</p>
                  <p className="text-3xl font-bold">{stats.totalCodes}</p>
                </div>

                <div className="bg-card rounded-xl p-6 shadow-sm border">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-warning p-3 rounded-lg text-primary-foreground">
                      <Activity size={24} />
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm mb-1">Pending Referrals</p>
                  <p className="text-3xl font-bold">{stats.pendingReferrals}</p>
                </div>
              </div>

              <div className="bg-card rounded-xl shadow-sm p-6 border">
                <h2 className="text-xl font-bold mb-4">Create Registration Code</h2>
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
              </div>
            </>
          )}

          {activeTab === "users" && (
            <>
              <h1 className="text-3xl font-bold mb-6">User Management</h1>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="bg-card rounded-xl p-6 shadow-sm border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm mb-1">Total Users</p>
                      <p className="text-3xl font-bold">{stats.totalUsers}</p>
                    </div>
                    <Users className="text-primary" size={32} />
                  </div>
                </div>
                <div className="bg-card rounded-xl p-6 shadow-sm border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm mb-1">Active Users</p>
                      <p className="text-3xl font-bold text-success">{Math.floor(stats.totalUsers * 0.9)}</p>
                    </div>
                    <CheckCircle className="text-success" size={32} />
                  </div>
                </div>
                <div className="bg-card rounded-xl p-6 shadow-sm border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm mb-1">Suspended</p>
                      <p className="text-3xl font-bold text-warning">{Math.floor(stats.totalUsers * 0.07)}</p>
                    </div>
                    <AlertTriangle className="text-warning" size={32} />
                  </div>
                </div>
                <div className="bg-card rounded-xl p-6 shadow-sm border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm mb-1">Deactivated</p>
                      <p className="text-3xl font-bold text-destructive">{Math.floor(stats.totalUsers * 0.03)}</p>
                    </div>
                    <X className="text-destructive" size={32} />
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-xl shadow-sm p-6 border">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">All Users</h2>
                  <div className="flex gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                      <Input
                        type="text"
                        placeholder="Search users..."
                        className="pl-10"
                      />
                    </div>
                    <Select defaultValue="all">
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                        <SelectItem value="deactivated">Deactivated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 text-muted-foreground font-semibold">User</th>
                        <th className="text-left py-3 px-4 text-muted-foreground font-semibold">Email</th>
                        <th className="text-left py-3 px-4 text-muted-foreground font-semibold">Role</th>
                        <th className="text-left py-3 px-4 text-muted-foreground font-semibold">Facility</th>
                        <th className="text-left py-3 px-4 text-muted-foreground font-semibold">Status</th>
                        <th className="text-left py-3 px-4 text-muted-foreground font-semibold">Last Active</th>
                        <th className="text-left py-3 px-4 text-muted-foreground font-semibold">Actions</th>
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
                        name="Dr. Michael Ochieng"
                        email="m.ochieng@kenyatta.hospital"
                        role="Doctor"
                        facility="Kenyatta Hospital"
                        status="Active"
                        lastActive="1 day ago"
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
              </div>
            </>
          )}

          {(activeTab === "referrals" || activeTab === "facilities" || activeTab === "providers" || activeTab === "analytics" || activeTab === "security") && (
            <div>
              <h1 className="text-3xl font-bold mb-6">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
              <div className="bg-card rounded-xl shadow-sm p-6 border">
                <p className="text-muted-foreground">This section is under development...</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
