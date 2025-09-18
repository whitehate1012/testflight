import { Fragment, useEffect, useMemo, useState } from "react";
import { useAuth } from "../App";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { ApiResponse, Site, User, AttendanceRecord } from "@shared/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { MapPin, Search, User as UserIcon } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export default function Sites() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [users, setUsers] = useState<User[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [search, setSearch] = useState("");

  const [selectedForemanId, setSelectedForemanId] = useState<string | null>(
    null,
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [foremanRecords, setForemanRecords] = useState<
    Record<string, AttendanceRecord[]>
  >({});
  const [loadingForeman, setLoadingForeman] = useState<Record<string, boolean>>(
    {},
  );

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const siteIncharges = useMemo(
    () => users.filter((u) => u.role === "site_incharge"),
    [users],
  );
  const foremen = useMemo(
    () => users.filter((u) => u.role === "foreman"),
    [users],
  );

  const filteredSites = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sites;
    return sites.filter((s) =>
      [s.name, s.location, s.inchargeName].some((v) =>
        v?.toLowerCase().includes(q),
      ),
    );
  }, [search, sites]);

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
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <p className="text-gray-600">Only admins can view this page.</p>
      </div>
    );
  }

  const toggleRow = (siteId: string) =>
    setExpanded((p) => ({ ...p, [siteId]: !p[siteId] }));

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="text-gray-600">
            Browse sites and view attendance per foreman
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search sites..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance</CardTitle>
          <CardDescription>
            Tap a site to expand and view foremen; click a foreman to view
            attendance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSites.length === 0 ? (
            <div className="text-gray-500">No sites found.</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SITE INCHARGE</TableHead>
                    <TableHead>NAME</TableHead>
                    <TableHead>LOCATION</TableHead>
                    <TableHead className="text-right">TOTAL FOREMEN</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSites.map((s) => {
                    const siteForemen = foremen.filter(
                      (f) => f.siteId === s.id,
                    );
                    const inchargeLabel =
                      s.inchargeName || "No incharge assigned";
                    return (
                      <Fragment key={s.id}>
                        <TableRow
                          className="cursor-pointer"
                          onClick={() => toggleRow(s.id)}
                        >
                          <TableCell className="text-gray-700">
                            <div className="flex items-center gap-2">
                              <UserIcon className="h-4 w-4 text-emerald-600" />{" "}
                              {inchargeLabel}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {s.name}
                          </TableCell>
                          <TableCell className="text-gray-600">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4 text-gray-400" />{" "}
                              {s.location}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {siteForemen.length}
                          </TableCell>
                        </TableRow>
                        <AnimatePresence>
                          {expanded[s.id] ? (
                            <TableRow>
                              <TableCell colSpan={4} className="bg-gray-50">
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{
                                    duration: 0.25,
                                    ease: "easeInOut",
                                  }}
                                >
                                  <div className="p-4 border rounded-md">
                                    <div className="text-sm font-medium mb-2">
                                      Site Foremen
                                    </div>
                                    <div className="mt-2 space-y-2">
                                      {siteForemen.length === 0 ? (
                                        <div className="text-gray-500 text-sm">
                                          No foremen assigned
                                        </div>
                                      ) : (
                                        siteForemen.map((f) => (
                                          <div
                                            key={f.id}
                                            className="flex items-center justify-between border rounded px-2 py-1.5 text-sm bg-white"
                                          >
                                            <div className="flex items-center gap-2">
                                              <span className="inline-flex h-5 w-5 items-center justify-center rounded border text-[10px]">
                                                {f.name?.charAt(0) || "F"}
                                              </span>
                                              {f.name}
                                            </div>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="h-7 px-2"
                                              onClick={() =>
                                                openForemanDialog(f.id)
                                              }
                                            >
                                              View
                                            </Button>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              </TableCell>
                            </TableRow>
                          ) : null}
                        </AnimatePresence>
                      </Fragment>
                    );
                  })}
                </TableBody>
                <TableCaption className="text-left">
                  Showing {filteredSites.length} sites
                </TableCaption>
              </Table>
            </>
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
                  const records = (
                    foremanRecords[selectedForemanId] || []
                  ).slice();
                  if (records.length === 0) {
                    return (
                      <div className="text-sm text-gray-500">
                        No attendance records.
                      </div>
                    );
                  }
                  records.sort((a, b) => (a.date < b.date ? 1 : -1));
                  const latest = records[0];
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between border rounded p-2">
                        <div>
                          <div className="font-medium">{latest.date}</div>
                          <div className="text-xs text-gray-500">
                            {latest.presentWorkers}/{latest.totalWorkers}{" "}
                            present
                          </div>
                        </div>
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
