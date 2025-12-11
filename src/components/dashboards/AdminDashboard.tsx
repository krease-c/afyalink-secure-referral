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
  UserCircle, Ban, UserCheck, UserX, MoreVertical, Code, Activity, ChevronDown 
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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

interface PendingUser {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  roles: string[];
}

const AdminDashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [notifications, setNotifications] = useState(3);
  const [usersOpen, setUsersOpen] = useState(false);
  const [facilitiesOpen, setFacilitiesOpen] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalReferrals: 0,
    totalCodes: 0,
    pendingReferrals: 0,
    pendingUsers: 0,
  });
  const [newCode, setNewCode] = useState({ code: "", role: "patient" });
  const [dbFacilities, setDbFacilities] = useState<any[]>([]);
  const [facilityLevels, setFacilityLevels] = useState<any[]>([]);
  const [loadingFacilities, setLoadingFacilities] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loadingPendingUsers, setLoadingPendingUsers] = useState(false);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loadingReferrals, setLoadingReferrals] = useState(false);
  const [activatingUsers, setActivatingUsers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});
  const [activatedUsers, setActivatedUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchStats();
    fetchFacilityLevels();
    fetchPendingUsers();
    fetchReferrals();
  }, []);

  useEffect(() => {
    if (activeTab.startsWith("facilities")) {
      fetchFacilitiesByLevel();
    }
  }, [activeTab]);

  const fetchPendingUsers = async () => {
    setLoadingPendingUsers(true);
    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch roles for each pending user
      const usersWithRoles = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", profile.id);
          return {
            ...profile,
            roles: roles?.map(r => r.role) || []
          };
        })
      );

      setPendingUsers(usersWithRoles);
    } catch (error) {
      console.error("Error fetching pending users:", error);
    } finally {
      setLoadingPendingUsers(false);
    }
  };

  const fetchReferrals = async () => {
    setLoadingReferrals(true);
    try {
      const { data, error } = await supabase
        .from("referrals")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReferrals(data || []);
    } catch (error) {
      console.error("Error fetching referrals:", error);
    } finally {
      setLoadingReferrals(false);
    }
  };

  const handleActivateUser = async (userId: string) => {
    const selectedRole = selectedRoles[userId];
    
    // Check if user already has a role or admin selected one
    const user = pendingUsers.find(u => u.id === userId);
    const hasExistingRole = user?.roles && user.roles.length > 0;
    
    if (!hasExistingRole && !selectedRole) {
      toast({
        title: "Role Required",
        description: "Please select a role for this user before activating.",
        variant: "destructive",
      });
      return;
    }

    setActivatingUsers(prev => new Set(prev).add(userId));
    try {
      // If user doesn't have a role, assign the selected one
      if (!hasExistingRole && selectedRole) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: selectedRole as "admin" | "doctor" | "nurse" | "patient" | "pharmacist" | "lab_technician" });
        
        if (roleError) throw roleError;
      }

      // Activate the user
      const { error } = await supabase
        .from("profiles")
        .update({ status: "active" })
        .eq("id", userId);

      if (error) throw error;

      // Show activated status
      setActivatingUsers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      setActivatedUsers(prev => new Set(prev).add(userId));
      
      toast({ 
        title: "User Activated", 
        description: "The user can now log in to the system."
      });
      
      // Remove from list after showing "Activated" for 2 seconds
      setTimeout(() => {
        setActivatedUsers(prev => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
        fetchPendingUsers();
        fetchStats();
      }, 2000);
    } catch (error: any) {
      setActivatingUsers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchStats = async () => {
    try {
      const [profiles, referrals, codes, pending, pendingProfiles] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("referrals").select("id", { count: "exact", head: true }),
        supabase.from("registration_codes").select("id", { count: "exact", head: true }),
        supabase.from("referrals").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);

      setStats({
        totalUsers: profiles.count || 0,
        totalReferrals: referrals.count || 0,
        totalCodes: codes.count || 0,
        pendingReferrals: pending.count || 0,
        pendingUsers: pendingProfiles.count || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchFacilityLevels = async () => {
    try {
      const { data, error } = await supabase
        .from("facility_levels")
        .select("*")
        .order("level", { ascending: false });
      
      if (error) throw error;
      setFacilityLevels(data || []);
    } catch (error) {
      console.error("Error fetching facility levels:", error);
    }
  };

  const fetchFacilitiesByLevel = async () => {
    setLoadingFacilities(true);
    try {
      let query = supabase
        .from("facilities")
        .select(`
          *,
          facility_levels (
            id,
            level,
            name,
            description
          )
        `)
        .order("name");

      // Filter by level if a specific level is selected
      if (activeTab.includes("level-")) {
        const levelNum = parseInt(activeTab.split("level-")[1]);
        const levelData = facilityLevels.find(l => l.level === levelNum);
        if (levelData) {
          query = query.eq("level_id", levelData.id);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      setDbFacilities(data || []);
    } catch (error) {
      console.error("Error fetching facilities:", error);
    } finally {
      setLoadingFacilities(false);
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

  // Mock data counts for user role sections
  const mockCounts = {
    doctors: { total: 45, active: 42, suspended: 2, deactivated: 1 },
    nurses: { total: 32, active: 28, suspended: 3, deactivated: 1 },
    patients: { total: 156, active: 148, suspended: 5, deactivated: 3 },
    pharmacists: { total: 18, active: 16, suspended: 1, deactivated: 1 },
    labTechnicians: { total: 12, active: 11, suspended: 1, deactivated: 0 },
  };

  const dashboardStats = [
    { label: "Total Referrals", value: stats.totalReferrals.toString(), icon: ClipboardList, color: "bg-primary", change: "+12%" },
    { label: "Active Facilities", value: dbFacilities.filter(f => f.status === "active").length.toString(), icon: Building2, color: "bg-success", change: "+5%" },
    { label: "Total Users", value: stats.totalUsers.toString(), icon: UserCircle, color: "bg-accent", change: "+8%" },
    { label: "Pending Referrals", value: stats.pendingReferrals.toString(), icon: Clock, color: "bg-warning", change: "-3%" }
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
          <Collapsible open={facilitiesOpen} onOpenChange={setFacilitiesOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant={activeTab.startsWith("facilities") ? "secondary" : "ghost"}
                className="w-full justify-start gap-3 mb-2"
              >
                <Building2 size={20} /> 
                <span className="flex-1 text-left">Facilities</span>
                <ChevronDown 
                  size={16} 
                  className={`transition-transform ${facilitiesOpen ? "rotate-180" : ""}`} 
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-8 space-y-1">
              <Button
                variant={activeTab === "facilities-all" ? "secondary" : "ghost"}
                className="w-full justify-start gap-3 mb-1 text-sm"
                onClick={() => setActiveTab("facilities-all")}
              >
                All Facilities
              </Button>
              <Button
                variant={activeTab === "facilities-level-6" ? "secondary" : "ghost"}
                className="w-full justify-start gap-3 mb-1 text-sm"
                onClick={() => setActiveTab("facilities-level-6")}
              >
                Level 6 - National
              </Button>
              <Button
                variant={activeTab === "facilities-level-5" ? "secondary" : "ghost"}
                className="w-full justify-start gap-3 mb-1 text-sm"
                onClick={() => setActiveTab("facilities-level-5")}
              >
                Level 5 - County
              </Button>
              <Button
                variant={activeTab === "facilities-level-4" ? "secondary" : "ghost"}
                className="w-full justify-start gap-3 mb-1 text-sm"
                onClick={() => setActiveTab("facilities-level-4")}
              >
                Level 4 - Sub-County
              </Button>
              <Button
                variant={activeTab === "facilities-level-3" ? "secondary" : "ghost"}
                className="w-full justify-start gap-3 mb-1 text-sm"
                onClick={() => setActiveTab("facilities-level-3")}
              >
                Level 3 - Health Centre
              </Button>
              <Button
                variant={activeTab === "facilities-level-2" ? "secondary" : "ghost"}
                className="w-full justify-start gap-3 mb-1 text-sm"
                onClick={() => setActiveTab("facilities-level-2")}
              >
                Level 2 - Dispensary
              </Button>
              <Button
                variant={activeTab === "facilities-level-1" ? "secondary" : "ghost"}
                className="w-full justify-start gap-3 mb-1 text-sm"
                onClick={() => setActiveTab("facilities-level-1")}
              >
                Level 1 - Community
              </Button>
            </CollapsibleContent>
          </Collapsible>
          
          <Collapsible open={usersOpen} onOpenChange={setUsersOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant={activeTab.startsWith("users") ? "secondary" : "ghost"}
                className="w-full justify-start gap-3 mb-2"
              >
                <Users size={20} /> 
                <span className="flex-1 text-left">Healthcare Providers</span>
                <ChevronDown 
                  size={16} 
                  className={`transition-transform ${usersOpen ? "rotate-180" : ""}`} 
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-8 space-y-1">
              <Button
                variant={activeTab === "users-doctors" ? "secondary" : "ghost"}
                className="w-full justify-start gap-3 mb-1 text-sm"
                onClick={() => setActiveTab("users-doctors")}
              >
                Doctors
              </Button>
              <Button
                variant={activeTab === "users-nurses" ? "secondary" : "ghost"}
                className="w-full justify-start gap-3 mb-1 text-sm"
                onClick={() => setActiveTab("users-nurses")}
              >
                Nurses
              </Button>
              <Button
                variant={activeTab === "users-patients" ? "secondary" : "ghost"}
                className="w-full justify-start gap-3 mb-1 text-sm"
                onClick={() => setActiveTab("users-patients")}
              >
                Patients
              </Button>
              <Button
                variant={activeTab === "users-pharmacists" ? "secondary" : "ghost"}
                className="w-full justify-start gap-3 mb-1 text-sm"
                onClick={() => setActiveTab("users-pharmacists")}
              >
                Pharmacists
              </Button>
              <Button
                variant={activeTab === "users-lab-technicians" ? "secondary" : "ghost"}
                className="w-full justify-start gap-3 mb-1 text-sm"
                onClick={() => setActiveTab("users-lab-technicians")}
              >
                Lab Technicians
              </Button>
            </CollapsibleContent>
          </Collapsible>
          <Button
            variant={activeTab === "pending-users" ? "secondary" : "ghost"}
            className="w-full justify-start gap-3 mb-2"
            onClick={() => setActiveTab("pending-users")}
          >
            <Clock size={20} /> 
            <span className="flex-1 text-left">Pending Users</span>
            {stats.pendingUsers > 0 && (
              <Badge className="bg-warning text-warning-foreground">{stats.pendingUsers}</Badge>
            )}
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
                placeholder="Search referrals, facilities, users..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
                  {loadingReferrals ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : referrals.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No referrals found</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {referrals
                        .filter(referral => 
                          searchQuery === "" ||
                          referral.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          referral.facility_from?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          referral.facility_to?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          referral.diagnosis?.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((referral) => (
                        <div key={referral.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                              <ClipboardList className="text-primary" size={24} />
                            </div>
                            <div>
                              <p className="font-semibold">{referral.reason}</p>
                              <p className="text-sm text-muted-foreground">
                                {referral.facility_from} → {referral.facility_to}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Diagnosis: {referral.diagnosis || "N/A"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge 
                              variant={referral.urgency === 'high' ? 'destructive' : referral.urgency === 'medium' ? 'default' : 'secondary'}
                            >
                              {referral.urgency}
                            </Badge>
                            <Badge 
                              variant={referral.status === 'completed' ? 'default' : referral.status === 'pending' ? 'outline' : 'secondary'}
                            >
                              {referral.status}
                            </Badge>
                            <p className="text-xs text-muted-foreground">
                              {new Date(referral.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab.startsWith("facilities") && (
            <div>
              <h1 className="text-3xl font-bold mb-6">
                {activeTab === "facilities-all" && "All Facilities"}
                {activeTab === "facilities-level-6" && "Level 6 - National Referral Hospitals"}
                {activeTab === "facilities-level-5" && "Level 5 - County Referral Hospitals"}
                {activeTab === "facilities-level-4" && "Level 4 - Sub-County Hospitals"}
                {activeTab === "facilities-level-3" && "Level 3 - Health Centres"}
                {activeTab === "facilities-level-2" && "Level 2 - Dispensaries"}
                {activeTab === "facilities-level-1" && "Level 1 - Community Units"}
              </h1>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Facilities</p>
                        <p className="text-3xl font-bold">{dbFacilities.length}</p>
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
                          {dbFacilities.filter(f => f.status === "active").length}
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
                        <p className="text-3xl font-bold">
                          {dbFacilities.length > 0 
                            ? (dbFacilities.reduce((acc, f) => acc + (f.rating || 0), 0) / dbFacilities.length).toFixed(1)
                            : "N/A"}
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="pt-6">
                  {loadingFacilities ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : dbFacilities.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No facilities found for this level</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {dbFacilities
                        .filter(facility =>
                          searchQuery === "" ||
                          facility.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          facility.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          facility.address?.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((facility) => (
                        <div key={facility.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                              <Building2 className="text-primary" size={24} />
                            </div>
                            <div>
                              <p className="font-semibold">{facility.name}</p>
                              <p className="text-sm text-muted-foreground">{facility.type}</p>
                              <p className="text-xs text-muted-foreground">{facility.address}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-8">
                            <div className="text-right">
                              <Badge variant="outline">
                                Level {facility.facility_levels?.level || "N/A"}
                              </Badge>
                              <p className="text-xs text-muted-foreground mt-1">
                                {facility.facility_levels?.name || "Unknown"}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-semibold">{facility.rating || 0}</p>
                              <p className="text-sm text-muted-foreground">Rating</p>
                            </div>
                            <Badge className={facility.status === "active" ? "bg-success" : "bg-muted"}>
                              {facility.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "providers" && (
            <div>
              <h1 className="text-3xl font-bold mb-6">Healthcare Providers</h1>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Doctors</p>
                        <p className="text-3xl font-bold">{mockCounts.doctors.total}</p>
                      </div>
                      <UserCircle className="h-8 w-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Nurses</p>
                        <p className="text-3xl font-bold">{mockCounts.nurses.total}</p>
                      </div>
                      <UserCircle className="h-8 w-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Pharmacists</p>
                        <p className="text-3xl font-bold">{mockCounts.pharmacists.total}</p>
                      </div>
                      <UserCircle className="h-8 w-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Lab Technicians</p>
                        <p className="text-3xl font-bold">{mockCounts.labTechnicians.total}</p>
                      </div>
                      <UserCircle className="h-8 w-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <Tabs defaultValue="doctors" className="space-y-6">
                <TabsList>
                  <TabsTrigger value="doctors">Doctors</TabsTrigger>
                  <TabsTrigger value="nurses">Nurses</TabsTrigger>
                  <TabsTrigger value="pharmacists">Pharmacists</TabsTrigger>
                  <TabsTrigger value="lab-technicians">Lab Technicians</TabsTrigger>
                </TabsList>
                
                <TabsContent value="doctors">
                  <Card>
                    <CardHeader>
                      <CardTitle>Registered Doctors ({mockCounts.doctors.total})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {[
                          { name: "Dr. Jane Kamau", specialty: "Cardiology", facility: "Kenyatta National Hospital", patients: 52 },
                          { name: "Dr. John Mwangi", specialty: "Neurology", facility: "Nairobi Hospital", patients: 38 },
                          { name: "Dr. Grace Njeri", specialty: "Pediatrics", facility: "Moi Teaching and Referral Hospital", patients: 45 },
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
                      <CardTitle>Registered Nurses ({mockCounts.nurses.total})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {[
                          { name: "Nurse Sarah Wanjiru", department: "Emergency", facility: "Coast General Hospital", assigned: 12 },
                          { name: "Nurse David Kipchoge", department: "ICU", facility: "Nakuru Level 5 Hospital", assigned: 8 },
                          { name: "Nurse Mary Otieno", department: "Maternity", facility: "Embu Level 5 Hospital", assigned: 10 },
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

                <TabsContent value="pharmacists">
                  <Card>
                    <CardHeader>
                      <CardTitle>Registered Pharmacists ({mockCounts.pharmacists.total})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {[
                          { name: "Pharm. Michael Ouma", department: "Main Pharmacy", facility: "Kenyatta National Hospital", prescriptions: 156 },
                          { name: "Pharm. Lucy Muthoni", department: "Outpatient Pharmacy", facility: "Nairobi Hospital", prescriptions: 98 },
                          { name: "Pharm. Joseph Kariuki", department: "Emergency Pharmacy", facility: "Coast General Hospital", prescriptions: 87 },
                        ].map((pharmacist, i) => (
                          <div key={i} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                <UserCircle className="text-primary" size={24} />
                              </div>
                              <div>
                                <p className="font-semibold">{pharmacist.name}</p>
                                <p className="text-sm text-muted-foreground">{pharmacist.department}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <p className="font-semibold">{pharmacist.facility}</p>
                                <p className="text-sm text-muted-foreground">{pharmacist.prescriptions} prescriptions</p>
                              </div>
                              <Badge>Active</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="lab-technicians">
                  <Card>
                    <CardHeader>
                      <CardTitle>Registered Lab Technicians ({mockCounts.labTechnicians.total})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {[
                          { name: "Lab Tech. Susan Achieng", department: "Hematology", facility: "Kenyatta National Hospital", tests: 247 },
                          { name: "Lab Tech. Brian Kimani", department: "Microbiology", facility: "Moi Teaching and Referral Hospital", tests: 189 },
                          { name: "Lab Tech. Faith Njoki", department: "Biochemistry", facility: "Embu Level 5 Hospital", tests: 156 },
                        ].map((labTech, i) => (
                          <div key={i} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                <UserCircle className="text-primary" size={24} />
                              </div>
                              <div>
                                <p className="font-semibold">{labTech.name}</p>
                                <p className="text-sm text-muted-foreground">{labTech.department}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <p className="font-semibold">{labTech.facility}</p>
                                <p className="text-sm text-muted-foreground">{labTech.tests} tests</p>
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

          {(activeTab === "users-doctors" || activeTab === "users-nurses" || activeTab === "users-patients" || activeTab === "users-pharmacists" || activeTab === "users-lab-technicians") && (
            <>
              <h1 className="text-3xl font-bold mb-6">
                {activeTab === "users-doctors" && "Doctor Management"}
                {activeTab === "users-nurses" && "Nurse Management"}
                {activeTab === "users-patients" && "Patient Management"}
                {activeTab === "users-pharmacists" && "Pharmacist Management"}
                {activeTab === "users-lab-technicians" && "Lab Technician Management"}
              </h1>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Total {activeTab === "users-doctors" ? "Doctors" : activeTab === "users-nurses" ? "Nurses" : activeTab === "users-patients" ? "Patients" : activeTab === "users-pharmacists" ? "Pharmacists" : "Lab Technicians"}
                        </p>
                        <p className="text-3xl font-bold">
                          {activeTab === "users-doctors" ? mockCounts.doctors.total : 
                           activeTab === "users-nurses" ? mockCounts.nurses.total : 
                           activeTab === "users-patients" ? mockCounts.patients.total : 
                           activeTab === "users-pharmacists" ? mockCounts.pharmacists.total : 
                           mockCounts.labTechnicians.total}
                        </p>
                      </div>
                      <Users className="h-8 w-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Active</p>
                        <p className="text-3xl font-bold text-success">
                          {activeTab === "users-doctors" ? mockCounts.doctors.active : 
                           activeTab === "users-nurses" ? mockCounts.nurses.active : 
                           activeTab === "users-patients" ? mockCounts.patients.active : 
                           activeTab === "users-pharmacists" ? mockCounts.pharmacists.active : 
                           mockCounts.labTechnicians.active}
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
                        <p className="text-sm text-muted-foreground">Suspended</p>
                        <p className="text-3xl font-bold text-warning">
                          {activeTab === "users-doctors" ? mockCounts.doctors.suspended : 
                           activeTab === "users-nurses" ? mockCounts.nurses.suspended : 
                           activeTab === "users-patients" ? mockCounts.patients.suspended : 
                           activeTab === "users-pharmacists" ? mockCounts.pharmacists.suspended : 
                           mockCounts.labTechnicians.suspended}
                        </p>
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
                        <p className="text-3xl font-bold text-destructive">
                          {activeTab === "users-doctors" ? mockCounts.doctors.deactivated : 
                           activeTab === "users-nurses" ? mockCounts.nurses.deactivated : 
                           activeTab === "users-patients" ? mockCounts.patients.deactivated : 
                           activeTab === "users-pharmacists" ? mockCounts.pharmacists.deactivated : 
                           mockCounts.labTechnicians.deactivated}
                        </p>
                      </div>
                      <X className="h-8 w-8 text-destructive" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      {activeTab === "users-doctors" && "All Doctors"}
                      {activeTab === "users-nurses" && "All Nurses"}
                      {activeTab === "users-patients" && "All Patients"}
                      {activeTab === "users-pharmacists" && "All Pharmacists"}
                      {activeTab === "users-lab-technicians" && "All Lab Technicians"}
                    </CardTitle>
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
                        {activeTab === "users-doctors" && (
                          <>
                            <UserRow
                              name="Dr. Jane Kamau"
                              email="jane.kamau@kenyatta.hospital"
                              role="Doctor"
                              facility="Kenyatta National Hospital"
                              status="Active"
                              lastActive="2 hours ago"
                            />
                            <UserRow
                              name="Dr. John Mwangi"
                              email="j.mwangi@nairobi.hospital"
                              role="Doctor"
                              facility="Nairobi Hospital"
                              status="Active"
                              lastActive="1 day ago"
                            />
                            <UserRow
                              name="Dr. Grace Njeri"
                              email="g.njeri@moi.hospital"
                              role="Doctor"
                              facility="Moi Teaching and Referral Hospital"
                              status="Active"
                              lastActive="3 hours ago"
                            />
                          </>
                        )}
                        {activeTab === "users-nurses" && (
                          <>
                            <UserRow
                              name="Nurse Sarah Wanjiru"
                              email="s.wanjiru@coast.hospital"
                              role="Nurse"
                              facility="Coast General Hospital"
                              status="Active"
                              lastActive="5 hours ago"
                            />
                            <UserRow
                              name="Nurse Mary Otieno"
                              email="m.otieno@embu.hospital"
                              role="Nurse"
                              facility="Embu Level 5 Hospital"
                              status="Active"
                              lastActive="3 hours ago"
                            />
                            <UserRow
                              name="Nurse David Kipchoge"
                              email="d.kipchoge@nakuru.hospital"
                              role="Nurse"
                              facility="Nakuru Level 5 Hospital"
                              status="Suspended"
                              lastActive="2 days ago"
                            />
                          </>
                        )}
                        {activeTab === "users-patients" && (
                          <>
                            <UserRow
                              name="Peter Ochieng"
                              email="p.ochieng@gmail.com"
                              role="Patient"
                              facility="Mama Lucy Kibaki Hospital"
                              status="Active"
                              lastActive="1 hour ago"
                            />
                            <UserRow
                              name="Alice Wambui"
                              email="a.wambui@yahoo.com"
                              role="Patient"
                              facility="St. Mary's Mission Hospital"
                              status="Active"
                              lastActive="4 hours ago"
                            />
                            <UserRow
                              name="James Kiprotich"
                              email="j.kiprotich@gmail.com"
                              role="Patient"
                              facility="Narok County Referral Hospital"
                              status="Active"
                              lastActive="1 day ago"
                            />
                          </>
                        )}
                        {activeTab === "users-pharmacists" && (
                          <>
                            <UserRow
                              name="Pharm. Michael Ouma"
                              email="m.ouma@kenyatta.pharmacy"
                              role="Pharmacist"
                              facility="Kenyatta National Hospital"
                              status="Active"
                              lastActive="1 hour ago"
                            />
                            <UserRow
                              name="Pharm. Lucy Muthoni"
                              email="l.muthoni@nairobi.pharmacy"
                              role="Pharmacist"
                              facility="Nairobi Hospital"
                              status="Active"
                              lastActive="3 hours ago"
                            />
                            <UserRow
                              name="Pharm. Joseph Kariuki"
                              email="j.kariuki@coast.pharmacy"
                              role="Pharmacist"
                              facility="Coast General Hospital"
                              status="Suspended"
                              lastActive="5 days ago"
                            />
                          </>
                        )}
                        {activeTab === "users-lab-technicians" && (
                          <>
                            <UserRow
                              name="Lab Tech. Susan Achieng"
                              email="s.achieng@kenyatta.lab"
                              role="Lab Technician"
                              facility="Kenyatta National Hospital"
                              status="Active"
                              lastActive="30 minutes ago"
                            />
                            <UserRow
                              name="Lab Tech. Brian Kimani"
                              email="b.kimani@moi.lab"
                              role="Lab Technician"
                              facility="Moi Teaching and Referral Hospital"
                              status="Active"
                              lastActive="2 hours ago"
                            />
                            <UserRow
                              name="Lab Tech. Faith Njoki"
                              email="f.njoki@embu.lab"
                              role="Lab Technician"
                              facility="Embu Level 5 Hospital"
                              status="Active"
                              lastActive="4 hours ago"
                            />
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === "pending-users" && (
            <>
              <h1 className="text-3xl font-bold mb-6">Pending User Approvals</h1>
              
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Users Awaiting Approval</p>
                      <p className="text-3xl font-bold text-warning">{pendingUsers.length}</p>
                    </div>
                    <Clock className="h-8 w-8 text-warning" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>New User Registrations</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingPendingUsers ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : pendingUsers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-12 w-12 mx-auto mb-4 text-success opacity-50" />
                      <p>No pending user approvals</p>
                      <p className="text-sm">All registered users have been reviewed</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingUsers
                        .filter(user => 
                          searchQuery === "" || 
                          user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((user) => (
                          <div key={user.id} className={`flex items-center justify-between p-4 rounded-lg border ${
                            activatedUsers.has(user.id) 
                              ? 'bg-success/10 border-success/30' 
                              : 'bg-muted/30 border-warning/20'
                          }`}>
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                              activatedUsers.has(user.id) 
                                ? 'bg-success/20' 
                                : 'bg-warning/10'
                            }`}>
                              {activatedUsers.has(user.id) ? (
                                <CheckCircle className="text-success" size={24} />
                              ) : (
                                <Clock className="text-warning" size={24} />
                              )}
                            </div>
                            <div>
                              <p className="font-semibold">{user.full_name}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {user.roles.length > 0 ? (
                                  user.roles.map((role, i) => (
                                    <Badge key={i} variant="outline" className="capitalize">
                                      {role.replace('_', ' ')}
                                    </Badge>
                                  ))
                                ) : !activatedUsers.has(user.id) && (
                                  <Select
                                    value={selectedRoles[user.id] || ""}
                                    onValueChange={(value) => setSelectedRoles(prev => ({ ...prev, [user.id]: value }))}
                                  >
                                    <SelectTrigger className="w-40 h-8">
                                      <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="doctor">Doctor</SelectItem>
                                      <SelectItem value="nurse">Nurse</SelectItem>
                                      <SelectItem value="patient">Patient</SelectItem>
                                      <SelectItem value="pharmacist">Pharmacist</SelectItem>
                                      <SelectItem value="lab_technician">Lab Technician</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right text-sm text-muted-foreground">
                              <p>Registered</p>
                              <p>{new Date(user.created_at).toLocaleDateString()}</p>
                            </div>
                            {activatedUsers.has(user.id) ? (
                              <Badge className="bg-success text-success-foreground gap-1 py-2 px-4">
                                <CheckCircle size={16} />
                                Activated
                              </Badge>
                            ) : (
                              <Button
                                onClick={() => handleActivateUser(user.id)}
                                className="gap-2"
                                disabled={activatingUsers.has(user.id)}
                              >
                                {activatingUsers.has(user.id) ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                                    Activating...
                                  </>
                                ) : (
                                  <>
                                    <UserCheck size={18} />
                                    Activate
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
                            <SelectItem value="pharmacist">Pharmacist</SelectItem>
                            <SelectItem value="lab_technician">Lab Technician</SelectItem>
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