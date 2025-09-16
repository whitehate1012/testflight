import { useEffect, useMemo, useState } from "react";
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
import { Building2, Plus } from "lucide-react";
import { ApiResponse, Site, User } from "@shared/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";

export default function SiteManagement() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [users, setUsers] = useState<User[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [createOpen, setCreateOpen] = useState(false);

  const [siteForm, setSiteForm] = useState({
    name: "",
    location: "",
    inchargeId: "",
    foremanIds: [] as string[],
  });

  const siteIncharges = useMemo(
    () => users.filter((u) => u.role === "site_incharge"),
    [users],
  );
  const foremen = useMemo(
    () => users.filter((u) => u.role === "foreman"),
    [users],
  );

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const load = async () => {
      if (isAdmin) {
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
      }
    };
    load();
  }, [isAdmin]);

  const submitSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    // Enforce single-assignment for foremen on the client side
    const invalidForemen = siteForm.foremanIds.filter((id) => {
      const f = foremen.find((x) => x.id === id);
      return f && f.siteId && f.siteId !== "";
    });
    if (invalidForemen.length > 0) {
      alert("Some selected foremen are already assigned to another site.");
      return;
    }

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

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Site Management</h1>
        <p className="text-gray-600">Only admins can manage sites.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">SITES</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Create Site
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Site</DialogTitle>
              <DialogDescription>
                Assign a Site Incharge and Foremen. A foreman cannot be assigned to multiple sites.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={submitSite} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="siteName">Site Name</Label>
                  <Input
                    id="siteName"
                    required
                    value={siteForm.name}
                    onChange={(e) =>
                      setSiteForm({ ...siteForm, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    required
                    value={siteForm.location}
                    onChange={(e) =>
                      setSiteForm({ ...siteForm, location: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="incharge">Site Incharge</Label>
                  <select
                    id="incharge"
                    className="border rounded-md h-10 px-3 w-full"
                    value={siteForm.inchargeId}
                    onChange={(e) =>
                      setSiteForm({ ...siteForm, inchargeId: e.target.value })
                    }
                  >
                    <option value="">-- None --</option>
                    {siteIncharges.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <Label>Assign Foremen</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {foremen.map((f) => {
                    const alreadyAssigned = !!f.siteId && f.siteId !== "";
                    const checked = siteForm.foremanIds.includes(f.id);
                    return (
                      <label
                        key={f.id}
                        className="flex items-center gap-2 border rounded p-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          disabled={alreadyAssigned && !checked}
                          checked={checked}
                          onChange={(e) => {
                            setSiteForm((s) => ({
                              ...s,
                              foremanIds: e.target.checked
                                ? [...s.foremanIds, f.id]
                                : s.foremanIds.filter((id) => id !== f.id),
                            }));
                          }}
                        />
                        <span>
                          {f.name}
                          {alreadyAssigned && !checked && (
                            <span className="ml-2 text-xs text-gray-500">(assigned)</span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Create Site</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sites Overview</CardTitle>
          <CardDescription>Site → Incharge → Foremen</CardDescription>
        </CardHeader>
        <CardContent>
          {sites.length === 0 ? (
            <div className="text-gray-500">No sites found.</div>
          ) : (
            <div className="space-y-4">
              {sites.map((s) => {
                const siteForemen = foremen.filter((f) => f.siteId === s.id);
                return (
                  <div key={s.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">
                        {s.name} <span className="text-sm text-gray-500">({s.location})</span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Incharge: {s.inchargeName || "Not assigned"}
                    </div>
                    <div className="mt-2 ml-4 text-sm text-gray-700">
                      <div className="font-medium">Foremen:</div>
                      <ul className="list-disc list-inside">
                        {siteForemen.map((f) => (
                          <li key={f.id}>{f.name}</li>
                        ))}
                        {siteForemen.length === 0 && (
                          <li className="text-gray-500">None</li>
                        )}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
