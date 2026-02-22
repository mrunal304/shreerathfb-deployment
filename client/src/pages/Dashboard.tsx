import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useFeedback, useMarkContacted } from "@/hooks/use-feedback";
import { useAnalytics } from "@/hooks/use-analytics";
import { useLogout, useUser } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatsCard } from "@/components/StatsCard";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, 
  LineChart, Line, Cell, Tooltip as RechartsTooltip 
} from "recharts";
import { format } from "date-fns";
import { 
  LayoutDashboard, LogOut, Search, Star, TrendingUp, Phone, Eye, Menu, X, CheckCircle2, MessageSquare
} from "lucide-react";
import {
  Tooltip as ShadcnTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const COLORS = ['#FF4500', '#228B22', '#FFBB28', '#FF8042', '#8B4513'];
const LineChartTooltip = RechartsTooltip;
const BarChartTooltip = RechartsTooltip;

export default function Dashboard() {
  const { data: user, isLoading: userLoading } = useUser();
  const [, setLocation] = useLocation();
  const logout = useLogout();
  const [activeTab, setActiveTab] = useState<'overview' | 'feedback'>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  if (userLoading) return null;
  if (!user) {
    setLocation("/admin/login");
    return null;
  }

  const navItems = (
    <>
      <Button 
        variant={activeTab === 'overview' ? 'secondary' : 'ghost'} 
        className={`w-full justify-start ${activeTab === 'overview' ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white hover:bg-white/5'}`}
        onClick={() => {
          setActiveTab('overview');
          setIsSidebarOpen(false);
        }}
      >
        <LayoutDashboard className="mr-2 h-5 w-5" />
        Overview
      </Button>
      <Button 
        variant={activeTab === 'feedback' ? 'secondary' : 'ghost'} 
        className={`w-full justify-start ${activeTab === 'feedback' ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white hover:bg-white/5'}`}
        onClick={() => {
          setActiveTab('feedback');
          setIsSidebarOpen(false);
        }}
      >
        <MessageSquare className="mr-2 h-5 w-5" />
        Feedback
      </Button>
    </>
  );

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold font-display">Admin Panel</h2>
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden text-white/70 hover:text-white hover:bg-white/5"
          onClick={() => setIsSidebarOpen(false)}
        >
          <X className="h-6 w-6" />
        </Button>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        {navItems}
      </nav>
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-4 px-2">
          <Avatar className="h-8 w-8 bg-primary text-white border border-white/20">
            <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.username}</p>
            <p className="text-xs text-white/50 truncate capitalize">{user.role}</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          className="w-full justify-start text-red-300 hover:text-red-200 hover:bg-red-500/10"
          onClick={() => logout.mutate()}
        >
          <LogOut className="mr-2 h-5 w-5" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F5DC]/50 flex relative">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-secondary text-white transform transition-transform duration-300 ease-in-out shadow-2xl
        md:relative md:translate-x-0 
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {sidebarContent}
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8 min-h-screen overflow-y-auto w-full">
        <header className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden text-secondary"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </Button>
            <h2 className="text-2xl font-bold font-display text-secondary md:hidden">Admin Panel</h2>
          </div>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => logout.mutate()}>
            <LogOut className="h-5 w-5" />
          </Button>
        </header>

        {activeTab === 'overview' ? <OverviewTab /> : <FeedbackTab />}
      </main>
    </div>
  );
}

function OverviewTab() {
  const { data: analytics, isLoading } = useAnalytics('week');

  if (isLoading) return <div className="flex justify-center p-12"><div className="animate-spin text-primary">Loading...</div></div>;
  if (!analytics) return <div>No data available</div>;

  return (
    <div className="space-y-6 page-transition">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-secondary font-display">Dashboard Overview</h1>
          <p className="text-muted-foreground">Welcome back, here's what's happening today.</p>
        </div>
        <div className="text-sm text-muted-foreground bg-white px-3 py-1 rounded-full shadow-sm">
          Last 7 Days
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Total Feedback" 
          value={analytics.totalFeedback} 
          icon={MessageSquare}
          description="+12% from last week"
          trend="up"
        />
        <StatsCard 
          title="Average Rating" 
          value={analytics.averageRating.toFixed(1)} 
          icon={Star}
          description="Consistent excellence"
          trend="neutral"
        />
        <StatsCard 
          title="Response Rate" 
          value={`${analytics.responseRate}%`} 
          icon={CheckCircle2}
          description="Feedback acknowledged"
          trend="up"
        />
        <StatsCard 
          title="Top Category" 
          value={analytics.topCategory} 
          icon={TrendingUp}
          description="Highest rated metric"
          trend="up"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Trend Chart */}
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-border/50">
          <h3 className="text-lg font-semibold text-secondary mb-4">Rating Trends</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.weeklyTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="date" stroke="#8B4513" fontSize={12} tickFormatter={(val) => format(new Date(val), 'dd MMM')} />
                <YAxis domain={[0, 5]} stroke="#8B4513" fontSize={12} />
                <LineChartTooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Line type="monotone" dataKey="foodQuality" stroke="#FF4500" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="serviceSpeed" stroke="#228B22" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="ambience" stroke="#8B4513" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#FF4500]" /> Food Quality</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#228B22]" /> Service Speed</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#8B4513]" /> Ambience</span>
          </div>
        </div>

        {/* Category Performance */}
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-border/50">
          <h3 className="text-lg font-semibold text-secondary mb-4">Category Performance</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.categoryPerformance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e5e5" />
                <XAxis type="number" domain={[0, 5]} hide />
                <YAxis dataKey="category" type="category" width={80} stroke="#8B4513" fontSize={12} />
                <BarChartTooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="rating" radius={[0, 4, 4, 0]}>
                  {analytics.categoryPerformance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.rating > 4 ? '#228B22' : entry.rating > 3 ? '#FFBB28' : '#FF4500'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeedbackTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const { data, isLoading, isFetching, refetch } = useFeedback({ page, limit: 10, search });
  const markContacted = useMarkContacted();
  const { toast } = useToast();

  const handleRefresh = () => {
    refetch();
    toast({ title: "Refreshing", description: "Fetching latest feedback from database..." });
  };

  const handleMarkContacted = (id: string) => {
    const staffName = "Admin"; 
    
    markContacted.mutate({ id, data: { contactedBy: staffName } }, {
      onSuccess: () => {
        toast({ title: "Updated", description: "Customer marked as contacted" });
      },
      onError: () => {
        toast({ variant: "destructive", title: "Error", description: "Could not update status" });
      }
    });
  };

  return (
    <div className="space-y-6 page-transition">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-secondary font-display">Customer Feedback</h1>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleRefresh}
            disabled={isFetching}
            className="rounded-xl bg-white border-none shadow-sm hover:bg-secondary/5"
            title="Refresh Data"
          >
            <TrendingUp className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search name or phone..." 
              className="pl-9 h-10 rounded-xl bg-white border-none shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-lg border border-border/50 overflow-hidden">
        <Table>
          <TableHeader className="bg-secondary/5">
            <TableRow className="hover:bg-transparent border-b border-secondary/10">
              <TableHead className="w-[180px] font-semibold text-secondary">Customer</TableHead>
              <TableHead className="w-[150px] font-semibold text-secondary">Staff Member</TableHead>
              <TableHead className="font-semibold text-secondary">Ratings</TableHead>
              <TableHead className="hidden md:table-cell font-semibold text-secondary">Note</TableHead>
              <TableHead className="font-semibold text-secondary">Date</TableHead>
              <TableHead className="font-semibold text-secondary">Status</TableHead>
              <TableHead className="text-right font-semibold text-secondary">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-32 text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : !data || data.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-32 text-muted-foreground">No feedback submitted yet</TableCell>
              </TableRow>
            ) : (
              data.data.map((item) => (
                <TableRow key={item._id} className="hover:bg-secondary/5 border-b border-secondary/5 transition-colors">
                  <TableCell>
                    <div className="font-medium text-foreground">{item.name}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{item.phoneNumber}</span>
                      <TooltipProvider>
                        <ShadcnTooltip>
                          <TooltipTrigger asChild>
                            <a 
                              href={`tel:${item.phoneNumber}`}
                              className="text-primary hover:text-primary/80 transition-colors"
                              data-testid={`link-call-${item._id}`}
                            >
                              <Phone className="h-4 w-4" />
                            </a>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Call Customer</p>
                          </TooltipContent>
                        </ShadcnTooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{item.staffName || "-"}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-primary text-primary" />
                      <span className="font-bold text-primary">
                        {((item.ratings.foodQuality + item.ratings.foodTaste + item.ratings.staffBehavior + item.ratings.hygiene + item.ratings.ambience + item.ratings.serviceSpeed) / 6).toFixed(1)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell max-w-[200px]">
                    <span className="truncate block text-sm text-muted-foreground">
                      {item.note || "-"}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.createdAt ? format(new Date(item.createdAt), 'MMM d, h:mm a') : '-'}
                  </TableCell>
                  <TableCell>
                    {item.contactedBy ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Contacted
                      </span>
                    ) : (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="rounded-lg h-8 border-primary text-primary hover:bg-primary/5">
                            Contact
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Mark as Contacted</DialogTitle>
                            <DialogDescription>
                              Confirm that you have reached out to {item.name} regarding their feedback.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-4">
                            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                              <div><span className="font-semibold">Phone:</span> {item.phoneNumber}</div>
                              <div><span className="font-semibold">Avg Rating:</span> {((item.ratings.foodQuality + item.ratings.foodTaste + item.ratings.staffBehavior + item.ratings.hygiene + item.ratings.ambience + item.ratings.serviceSpeed) / 6).toFixed(1)}</div>
                            </div>
                            {item.note && (
                              <div className="bg-muted/50 p-3 rounded-lg text-sm italic text-muted-foreground">
                                "{item.note}"
                              </div>
                            )}
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button 
                              onClick={() => handleMarkContacted(item._id)}
                              disabled={markContacted.isPending}
                            >
                              {markContacted.isPending ? "Updating..." : "Confirm Contact"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="rounded-lg h-8 border-[#8B0000] text-[#8B0000] hover:bg-[#8B0000]/5 gap-2"
                          data-testid={`button-view-details-${item._id}`}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="hidden lg:inline">View Details</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-display text-secondary">Feedback Details</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6 pt-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <div>
                                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Customer Information</h4>
                                <div className="mt-2 space-y-1">
                                  <p className="font-medium text-lg">{item.name}</p>
                                  <div className="flex items-center gap-2">
                                    <p className="text-muted-foreground">{item.phoneNumber}</p>
                                    <a href={`tel:${item.phoneNumber}`} className="text-primary"><Phone className="h-4 w-4" /></a>
                                  </div>
                                </div>
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Visit Details</h4>
                                <div className="mt-2 space-y-1">
                                  <p><span className="text-muted-foreground">Location:</span> {item.location}</p>
                                  <p><span className="text-muted-foreground">Type:</span> {item.dineType === 'dine_in' ? 'Dine In' : 'Take Out'}</p>
                                  <p><span className="text-muted-foreground">Date:</span> {item.createdAt ? format(new Date(item.createdAt), 'MMMM d, yyyy h:mm a') : '-'}</p>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-4">
                              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Category Ratings</h4>
                              <div className="space-y-3">
                                {Object.entries(item.ratings).map(([category, rating]) => (
                                  <div key={category} className="flex items-center justify-between">
                                    <span className="capitalize text-sm">{category}</span>
                                    <div className="flex items-center gap-1">
                                      {Array.from({ length: 5 }).map((_, i) => (
                                        <Star 
                                          key={i} 
                                          className={`h-4 w-4 ${i < (rating as number) ? 'fill-primary text-primary' : 'text-gray-200'}`} 
                                        />
                                      ))}
                                      <span className="ml-2 font-bold text-sm">{rating as number}</span>
                                    </div>
                                  </div>
                                ))}
                                <div className="pt-2 border-t flex items-center justify-between font-bold">
                                  <span>Average Rating</span>
                                  <span className="text-primary text-lg">
                                    {((item.ratings.foodQuality + item.ratings.foodTaste + item.ratings.staffBehavior + item.ratings.hygiene + item.ratings.ambience + item.ratings.serviceSpeed) / 6).toFixed(1)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          {item.staffComment && (
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                              <h4 className="text-sm font-semibold text-blue-800 uppercase tracking-wider mb-2">Staff Feedback: {item.staffName}</h4>
                              <p className="text-secondary italic">"{item.staffComment}"</p>
                            </div>
                          )}
                          {item.note && (
                            <div className="bg-[#FFF8E1] p-4 rounded-xl border border-[#FFF3E0]">
                              <h4 className="text-sm font-semibold text-[#A1887F] uppercase tracking-wider mb-2">Additional Comments</h4>
                              <p className="text-secondary italic">"{item.note}"</p>
                            </div>
                          )}
                          {item.contactedBy && (
                            <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex items-center gap-3">
                              <CheckCircle2 className="text-green-600 h-5 w-5" />
                              <div>
                                <p className="text-sm text-green-800">
                                  Contacted by <span className="font-bold">{item.contactedBy}</span> on {item.contactedAt ? format(new Date(item.contactedAt), 'MMM d, yyyy') : 'unknown date'}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        
        {/* Pagination controls */}
        {data && data.pagination.pages > 1 && (
          <div className="p-4 border-t border-secondary/10 flex justify-between items-center">
             <Button 
               variant="outline" 
               size="sm" 
               onClick={() => setPage(p => Math.max(1, p - 1))}
               disabled={page === 1}
               className="rounded-lg"
             >
               Previous
             </Button>
             <span className="text-sm text-muted-foreground">
               Page {page} of {data.pagination.pages}
             </span>
             <Button 
               variant="outline" 
               size="sm" 
               onClick={() => setPage(p => Math.min(data.pagination.pages, p + 1))}
               disabled={page === data.pagination.pages}
               className="rounded-lg"
             >
               Next
             </Button>
          </div>
        )}
      </div>
    </div>
  );
}
