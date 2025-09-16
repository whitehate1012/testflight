import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../App";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion";
import { ApiResponse, Site, User, AttendanceRecord } from "@shared/api";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";

export default function Sites() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [users, setUsers] = useState<User[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [expandedSites, setExpandedSites] = useState<string[]>([]);
  const [expandedForemen, setExpandedForemen] = useState<Record<string, boolean>>({});
  const [selectedForemanId, setSelectedForemanId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [foremanRecords, setForemanRecords] = useState<
    Record<string, AttendanceRecord[]>
  >({});
  const [loadingForeman, setLoadingForeman] = useState<Record<string, boolean>>(
    {},
  );

  const siteIncharges = useMemo(
    () => users.filter((u) => u.role === "site_incharge"),
    [users],
  );
  const foremen = useMemo(
    () => users.filter((u) => u.role === "foreman"),
    [users],
  );

  useEffect(() => {
    if (!isAdmin) return;
    const token = localStorage.getItem("auth_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const load = async () => {
      const [u, s] = await Promise.all([
        fetch("/api/admin/users", { headers }).then(
          (r) => r.json() as Promise<ApiResponse<User[]>>,
        ),
        fetch("/api/sites", { headers }).then(
          (r) => r.json() as Promise<ApiResponse<Site[]>>,
        ),
      ]);
      if (u.success && u.data) setUsers(u.data);
      if (s.success && s.data) setSites(s.data);
    };
    load();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Sites</h1>
        <p className="text-gray-600">Only admins can view this page.</p>
      </div>
    );
  }

  const openForemanDialog = async (foremanId: string) => {
    setSelectedForemanId(foremanId);
    setDialogOpen(true);
    if (!foremanRecords[foremanId]) {
      try {
        setLoadingForeman((prev) => ({ ...prev, [foremanId]: true }));
        const token = localStorage.getItem("auth_token");
        const res = await fetch(`/api/attendance/foreman/${foremanId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data: ApiResponse<AttendanceRecord[]> = await res.json();
        if (data.success && data.data)
          setForemanRecords((prev) => ({ ...prev, [foremanId]: data.data! }));
      } finally {
        setLoadingForeman((prev) => ({ ...prev, [foremanId]: false }));
      }
    }
  };

  const statusLabel = (s: AttendanceRecord["status"]) => {
    if (s === "incharge_reviewed") return "Approved by Incharge";
    if (s === "submitted") return "Taken (Pending Review)";
    if (s === "admin_approved") return "Admin Approved";
    return "Rejected";
  };

  const statusVariant = (s: AttendanceRecord["status"]) => {
    if (s === "incharge_reviewed") return "default" as const;
    if (s === "submitted") return "secondary" as const;
    if (s === "admin_approved") return "outline" as const;
    return "destructive" as const;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sites</h1>
        <p className="text-gray-600">
          Browse sites and view attendance per foreman
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sites</CardTitle>
          <CardDescription>
            Site → Incharge (left) and Foremen (right)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sites.length === 0 ? (
            <div className="text-gray-500">No sites found.</div>
          ) : (
            <Accordion
              type="multiple"
              value={expandedSites}
              onValueChange={(v) => setExpandedSites(v as string[])}
            >
              {sites.map((site) => {
                const incharge = siteIncharges.find(
                  (u) => u.id === site.inchargeId,
                );
                const siteForemen = foremen.filter((f) => f.siteId === site.id);
                return (
                  <AccordionItem key={site.id} value={site.id}>
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{site.name}</span>
                        <span className="text-sm text-gray-500">
                          ({site.location})
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1 border rounded-md p-3">
                          <div className="text-sm text-gray-500">
                            Site Incharge
                          </div>
                          <div className="font-medium">
                            {incharge?.name || "Not Assigned"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {incharge?.username || "-"}
                          </div>
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          {siteForemen.length === 0 ? (
                            <div className="text-gray-500">
                              No foremen assigned.
                            </div>
                          ) : (
                            siteForemen.map((f) => (
                              <div key={f.id} className="border rounded-md">
                                <button
                                  className="w-full text-left px-3 py-2 hover:bg-muted"
                                  onClick={() => openForemanDialog(f.id)}
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="font-medium">
                                        {f.name}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        @{f.username}
                                      </div>
                                    </div>
                                    <div className="text-xs text-gray-500">View attendance</div>
                                  </div>
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Foreman Attendance</DialogTitle>
          </DialogHeader>
          {selectedForemanId ? (
            loadingForeman[selectedForemanId] ? (
              <div className="text-sm text-gray-500">Loading...</div>
            ) : (
              <div className="space-y-3">
                {(() => {
                  const records = (foremanRecords[selectedForemanId] || []).slice();
                  if (records.length === 0) {
                    return <div className="text-sm text-gray-500">No attendance records.</div>;
                  }
                  records.sort((a, b) => (a.date < b.date ? 1 : -1));
                  const latest = records[0];
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between border rounded p-2">
                        <div>
                          <div className="font-medium">{latest.date}</div>
                          <div className="text-xs text-gray-500">{latest.presentWorkers}/{latest.totalWorkers} present</div>
                        </div>
                        <Badge variant={statusVariant(latest.status)}>{statusLabel(latest.status)}</Badge>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
