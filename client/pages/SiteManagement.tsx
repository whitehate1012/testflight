import { Fragment, useEffect, useMemo, useState } from "react";
import { useAuth } from "../App";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/ui/accordion";
import { ApiResponse, DashboardStats, Site, User } from "@shared/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "../components/ui/dialog";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import ConfirmDialog from "../components/ConfirmDialog";
import { Building2, Info, MapPin, Pencil, Plus, RefreshCw, Search, Trash2, User as UserIcon, UserCheck, Users } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export default function SiteManagement() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [users, setUsers] = useState<User[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const [siteForm, setSiteForm] = useState({
    name: "",
    location: "",
    inchargeId: "",
    foremanIds: [] as string[],
  });

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [addForemanOpen, setAddForemanOpen] = useState(false);
  const [selectedSiteForForeman, setSelectedSiteForForeman] = useState<string>("");
  const [selectedForemanId, setSelectedForemanId] = useState<string>("");

  const [editOpen, setEditOpen] = useState(false);
  const [editingSiteId, setEditingSiteId] = useState<string>("");
  const [editForm, setEditForm] = useState({ name: "", location: "", inchargeId: "" });

  const siteIncharges = useMemo(() => users.filter((u) => u.role === "site_incharge"), [users]);
  const foremen = useMemo(() => users.filter((u) => u.role === "foreman"), [users]);

  const assignedForemenCount = useMemo(
    () => foremen.filter((f) => f.siteId && f.siteId !== "").length,
    [foremen],
  );

  const assignedInchargeCount = useMemo(
    () => new Set(sites.filter((s) => s.inchargeId).map((s) => s.inchargeId)).size,
    [sites],
  );

  const filteredSites = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sites;
    return sites.filter((s) =>
      [s.name, s.location, s.inchargeName].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [search, sites]);

  const loadAll = async () => {
    const token = localStorage.getItem("auth_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const [u, s, d] = await Promise.all([
      fetch("/api/admin/users", { headers }).then(
        (r) => r.json() as Promise<ApiResponse<User[]>>,
      ),
      fetch("/api/sites", { headers }).then(
        (r) => r.json() as Promise<ApiResponse<Site[]>>,
      ),
      fetch("/api/dashboard/stats", { headers }).then(
        (r) => r.json() as Promise<ApiResponse<DashboardStats>>,
      ),
    ]);
    if (u.success && u.data) setUsers(u.data);
    if (s.success && s.data) setSites(s.data);
    if (d.success && d.data) setStats(d.data);
  };

  useEffect(() => {
    if (isAdmin) {
      loadAll();
    }
  }, [isAdmin]);

  const submitSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    const token = localStorage.getItem("auth_token");
    const res = await fetch("/api/sites", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(siteForm),
    });
    const data: ApiResponse<Site> = await res.json();
    if (res.ok && data.success && data.data) {
      setSites([data.data, ...sites]);
      setSiteForm({ name: "", location: "", inchargeId: "", foremanIds: [] });
      setCreateOpen(false);
    } else {
      console.error("Create site failed", data);
    }
  };

  const toggleRow = (siteId: string) => {
    setExpanded((prev) => ({ ...prev, [siteId]: !prev[siteId] }));
  };

  const openAddForeman = (siteId: string) => {
    setSelectedSiteForForeman(siteId);
    setSelectedForemanId("");
    setAddForemanOpen(true);
  };

  const assignForeman = async () => {
    if (!selectedSiteForForeman || !selectedForemanId) return;
    const token = localStorage.getItem("auth_token");
    await fetch(`/api/admin/users/${selectedForemanId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ siteId: selectedSiteForForeman }),
    });
    setAddForemanOpen(false);
    await loadAll();
  };

  const removeForeman = async (foremanId: string) => {
    const token = localStorage.getItem("auth_token");
    await fetch(`/api/admin/users/${foremanId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ siteId: "" }),
    });
    await loadAll();
  };

  const openEdit = (site: Site) => {
    setEditingSiteId(site.id);
    setEditForm({ name: site.name, location: site.location, inchargeId: site.inchargeId || "" });
    setEditOpen(true);
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSiteId) return;
    const token = localStorage.getItem("auth_token");
    const res = await fetch(`/api/sites/${editingSiteId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(editForm),
    });
    const data: ApiResponse<Site> = await res.json();
    if (res.ok && data.success && data.data) {
      setSites((prev) => prev.map((s) => (s.id === data.data!.id ? data.data! : s)));
      setEditOpen(false);
    }
  };

  const deleteSite = async (siteId: string) => {
    const token = localStorage.getItem("auth_token");
    await fetch(`/api/sites/${siteId}`, {
      method: "DELETE",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    setSites((prev) => prev.filter((s) => s.id !== siteId));
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Sites</h1>
        <p className="text-gray-600">Only admins can manage sites.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Construction Sites</h1>
          <p className="text-gray-600">Manage your construction site locations and assigned foremen</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-sm">
              <Plus className="h-4 w-4 mr-2" /> Add Site
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Site</DialogTitle>
              <DialogDescription>
                Add a new site and optionally assign a Site Incharge.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={submitSite} className="space-y-4">
              <div className="space-y-3">
                <div>
                  <Label htmlFor="siteName">Site Name</Label>
                  <Input
                    id="siteName"
                    required
                    value={siteForm.name}
                    onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    required
                    value={siteForm.location}
                    onChange={(e) => setSiteForm({ ...siteForm, location: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="incharge">Site Incharge</Label>
                  <select
                    id="incharge"
                    className="border rounded-md h-10 px-3 w-full"
                    value={siteForm.inchargeId}
                    onChange={(e) => setSiteForm({ ...siteForm, inchargeId: e.target.value })}
                  >
                    <option value="">No Incharge Assigned</option>
                    {siteIncharges.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <DialogClose asChild>
                  <Button type="button" variant="secondary">Cancel</Button>
                </DialogClose>
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg bg-blue-50 p-4 flex items-start gap-3">
          <div className="rounded-md bg-blue-100 p-2"><Building2 className="h-5 w-5 text-blue-700" /></div>
          <div>
            <div className="text-2xl font-bold">{sites.length}</div>
            <div className="text-sm text-gray-600">Total Sites</div>
          </div>
        </div>
        <div className="rounded-lg bg-green-50 p-4 flex items-start gap-3">
          <div className="rounded-md bg-green-100 p-2"><UserCheck className="h-5 w-5 text-green-700" /></div>
          <div>
            <div className="text-2xl font-bold">{assignedInchargeCount}</div>
            <div className="text-sm text-gray-600">Site Incharge</div>
          </div>
        </div>
        <div className="rounded-lg bg-amber-50 p-4 flex items-start gap-3">
          <div className="rounded-md bg-amber-100 p-2"><UserIcon className="h-5 w-5 text-amber-700" /></div>
          <div>
            <div className="text-2xl font-bold">{assignedForemenCount}</div>
            <div className="text-sm text-gray-600">Assigned Foremen</div>
          </div>
        </div>
        <div className="rounded-lg bg-sky-50 p-4 flex items-start gap-3">
          <div className="rounded-md bg-sky-100 p-2"><Users className="h-5 w-5 text-sky-700" /></div>
          <div>
            <div className="text-2xl font-bold">{stats?.totalWorkers ?? 0}</div>
            <div className="text-sm text-gray-600">Total Workers</div>
          </div>
        </div>
      </div>

      {/* Search + Refresh */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search sites..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={loadAll}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Sites</CardTitle>
          <CardDescription>Click a site to view details and assignments</CardDescription>
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
                    <TableHead>ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSites.map((s) => {
                    const siteForemen = foremen.filter((f) => f.siteId === s.id);
                    const inchargeLabel = s.inchargeName || "No incharge assigned";
                    return (
                      <Fragment key={s.id}>
                        <TableRow className="cursor-pointer" onClick={() => toggleRow(s.id)}>
                          <TableCell className="text-gray-700">
                            <div className="flex items-center gap-2"><UserIcon className="h-4 w-4 text-emerald-600" /> {inchargeLabel}</div>
                          </TableCell>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell className="text-gray-600"><div className="flex items-center gap-1"><MapPin className="h-4 w-4 text-gray-400" /> {s.location}</div></TableCell>
                          <TableCell className="text-right font-semibold">{siteForemen.length}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <Button variant="outline" size="sm" onClick={() => openEdit(s)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <ConfirmDialog
                                title="Delete site?"
                                description="This will remove the site and unassign related users."
                                onConfirm={() => deleteSite(s.id)}
                                trigger={
                                  <Button variant="outline" size="sm">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                }
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                        {expanded[s.id] ? (
                          <TableRow>
                            <TableCell colSpan={5} className="bg-gray-50">
                              <div className="border rounded-md p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div>
                                    <div className="text-sm font-medium mb-2">Site Incharge</div>
                                    <div className="flex items-start gap-3">
                                      <UserIcon className="h-4 w-4 text-emerald-600 mt-1" />
                                      <div>
                                        <div className="font-medium">{inchargeLabel}</div>
                                        <div className="text-xs text-gray-500">{s.inchargeId || ""}</div>
                                      </div>
                                    </div>
                                  </div>
                                  <div>
                                    <div className="flex items-center justify-between">
                                      <div className="text-sm font-medium">Site Foremen</div>
                                      <Button size="sm" onClick={() => openAddForeman(s.id)}>
                                        <Plus className="h-4 w-4 mr-1"/> Add Foremen
                                      </Button>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-2"><Info className="h-3.5 w-3.5"/> Click on a foreman to view their attendance records</div>
                                    <div className="mt-3 space-y-2">
                                      {siteForemen.length === 0 ? (
                                        <div className="text-gray-500 text-sm">No foremen assigned</div>
                                      ) : (
                                        siteForemen.map((f) => (
                                          <div key={f.id} className="flex items-center justify-between border rounded px-2 py-1.5 text-sm bg-white">
                                            <div className="flex items-center gap-2">
                                              <span className="inline-flex h-5 w-5 items-center justify-center rounded border text-[10px]">{f.name?.charAt(0) || "F"}</span>
                                              {f.name}
                                            </div>
                                            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => removeForeman(f.id)}>
                                              ×
                                            </Button>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </TableBody>
                <TableCaption className="text-left">Showing {filteredSites.length} sites</TableCaption>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Foreman Dialog */}
      <Dialog open={addForemanOpen} onOpenChange={setAddForemanOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Foreman</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="foreman">Select a manager</Label>
            <select
              id="foreman"
              className="border rounded-md h-10 px-3 w-full"
              value={selectedForemanId}
              onChange={(e) => setSelectedForemanId(e.target.value)}
            >
              <option value="">Select a manager</option>
              {foremen.filter((f) => !f.siteId).map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button type="button" variant="secondary">Cancel</Button>
            </DialogClose>
            <Button onClick={assignForeman} disabled={!selectedForemanId}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Site Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Site</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitEdit} className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="editName">Site Name</Label>
                <Input id="editName" required value={editForm.name} onChange={(e)=>setEditForm({...editForm, name: e.target.value})} />
              </div>
              <div>
                <Label htmlFor="editLoc">Location</Label>
                <Input id="editLoc" required value={editForm.location} onChange={(e)=>setEditForm({...editForm, location: e.target.value})} />
              </div>
              <div>
                <Label htmlFor="editIncharge">Site Incharge</Label>
                <select
                  id="editIncharge"
                  className="border rounded-md h-10 px-3 w-full"
                  value={editForm.inchargeId}
                  onChange={(e) => setEditForm({ ...editForm, inchargeId: e.target.value })}
                >
                  <option value="">No Incharge Assigned</option>
                  {siteIncharges.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <DialogClose asChild>
                <Button type="button" variant="secondary">Cancel</Button>
              </DialogClose>
              <Button type="submit">Update</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
