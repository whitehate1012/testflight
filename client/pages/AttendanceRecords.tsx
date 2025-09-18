import { useEffect, useMemo, useState } from "react";
import { useEffect, useMemo, useState, Fragment } from "react";
import { ApiResponse, AttendanceRecord, User } from "@shared/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { AnimatePresence, motion } from "framer-motion";

export default function AttendanceRecords() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedForeman, setSelectedForeman] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  const foremen = useMemo(() => users.filter((u) => u.role === "foreman"), [users]);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    fetch("/api/admin/users", { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => r.json() as Promise<ApiResponse<User[]>>)
      .then((res) => { if (res.success && res.data) setUsers(res.data); });
  }, []);

  const fetchRecords = async () => {
    if (!selectedForeman) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/attendance/foreman/${selectedForeman}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const data: ApiResponse<AttendanceRecord[]> = await res.json();
      if (data.success && data.data) {
        const filtered = data.data.filter((r) => r.date === date);
        setRecords(filtered);
      } else {
        setRecords([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (s: AttendanceRecord["status"]) =>
    s === "admin_approved" ? "bg-green-100 text-green-700" : s === "incharge_reviewed" ? "bg-blue-100 text-blue-700" : s === "submitted" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance Records</h1>
        <p className="text-gray-600">Pick a date and foreman to view attendance</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="text-sm text-gray-600">Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-gray-600">Foreman</label>
            <select className="border rounded-md h-10 px-3 w-full" value={selectedForeman} onChange={(e) => setSelectedForeman(e.target.value)}>
              <option value="">Select foreman</option>
              {foremen.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Button onClick={fetchRecords} disabled={!selectedForeman || loading}>{loading ? "Loading..." : "Fetch"}</Button>
          </div>
        </CardContent>
      </Card>

      {records.length === 0 ? (
        <div className="text-sm text-gray-500">No records.</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Site</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Present/Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((r) => (
              <Fragment key={r.id}>
                <TableRow className="cursor-pointer" onClick={() => setExpanded((p)=>({ ...p, [r.id]: !p[r.id] }))}>
                  <TableCell className="font-medium">{r.siteName}</TableCell>
                  <TableCell>
                    <Badge className={statusColor(r.status)}>{r.status.replace("_"," ")}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{r.presentWorkers}/{r.totalWorkers}</TableCell>
                </TableRow>
                <AnimatePresence>
                  {expanded[r.id] ? (
                    <TableRow>
                      <TableCell colSpan={3}>
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
                          <div className="border rounded p-3">
                            <div className="text-sm text-gray-600 mb-2">Entries</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {r.entries.map((e) => (
                                <div key={e.workerId} className="border rounded p-2 text-sm">
                                  <div className="font-medium">{e.workerName}</div>
                                  <div className="text-xs text-gray-500">{e.isPresent ? "Present" : "Absent"}</div>
                                  {e.hoursWorked ? <div className="text-xs">Hours: {e.hoursWorked}</div> : null}
                                </div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </AnimatePresence>
              </Fragment>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
