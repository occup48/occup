import { DiningTableIcon } from "./DiningTableIcon";
import { useCallback, useEffect, useRef, useState } from "react";
import { CircleAlert, CircleCheck, Plus, RotateCw, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/features/auth/auth.context";
import { AdminLayout } from "./AdminLayout";
import { TableCard } from "./TableCard";
import { TableForm } from "./TableForm";
import { AdminTableError, getAdminTables, getTableError, updateAdminTable } from "./admin-table.service";
import type { AdminTable, TableStatusFilter } from "./admin-table.types";

type Editor = { mode: "create" } | { mode: "edit"; table: AdminTable };
const sortTables = (tables: AdminTable[]) => [...tables].sort((a, b) => a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true }));

export default function AdminTablesPage() {
  const { accessToken, signOut } = useAuth();
  const navigate = useNavigate();
  const [tables, setTables] = useState<AdminTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<TableStatusFilter>("all");
  const [area, setArea] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const requests = useRef(new Map<string, AbortController>());
  const pendingLoadMutations = useRef<Map<string, AdminTable> | null>(null);
  const addButton = useRef<HTMLButtonElement | null>(null);

  const handleAuthorizationError = useCallback((error: unknown) => {
    if (!(error instanceof AdminTableError)) return false;
    if (error.status === 401) { signOut(); return true; }
    if (error.status === 403) { navigate("/", { replace: true }); return true; }
    return false;
  }, [signOut, navigate]);

  useEffect(() => {
    const controller = new AbortController();
    const mutations = new Map<string, AdminTable>();
    pendingLoadMutations.current = mutations;
    getAdminTables(accessToken ?? "", controller.signal).then((data) => {
      if (controller.signal.aborted) return;
      // A pending GET may contain an older snapshot than a confirmed save.
      const loadedTables = new Map(data.map((table) => [table.id, table]));
      for (const [id, table] of mutations) loadedTables.set(id, table);
      setTables(sortTables([...loadedTables.values()]));
    }).catch((error: unknown) => {
      if (!controller.signal.aborted && !handleAuthorizationError(error)) setLoadError(getTableError(error));
    }).finally(() => {
      if (!controller.signal.aborted) {
        pendingLoadMutations.current = null;
        setLoading(false);
      }
    });
    return () => { controller.abort(); pendingLoadMutations.current = null; };
  }, [accessToken, reload, handleAuthorizationError]);

  useEffect(() => {
    const activeRequests = requests.current;
    return () => { for (const controller of activeRequests.values()) controller.abort(); activeRequests.clear(); };
  }, []);

  const locations = [...new Set(tables.map((table) => table.location?.trim()).filter((location): location is string => Boolean(location)))].sort((a, b) => a.localeCompare(b));
  // Renaming the last table in a location must not leave a stale filter selected.
  const selectedArea = locations.includes(area) ? area : "";
  const search = query.trim().toLowerCase();
  const filteredTables = tables.filter((table) =>
    (status === "all" || table.isActive === (status === "active")) &&
    (!selectedArea || table.location?.trim() === selectedArea) &&
    (!search || table.tableNumber.toLowerCase().includes(search) || table.location?.toLowerCase().includes(search)),
  );
  const activeCount = tables.filter((table) => table.isActive).length;
  const counts = { all: tables.length, active: activeCount, inactive: tables.length - activeCount };

  function retry() { setLoading(true); setLoadError(""); setReload((value) => value + 1); }
  function resetFilters() { setQuery(""); setStatus("all"); setArea(""); }
  function savedTable(table: AdminTable) {
    pendingLoadMutations.current?.set(table.id, table);
    setTables((current) => sortTables(current.some((item) => item.id === table.id) ? current.map((item) => item.id === table.id ? table : item) : [...current, table]));
    setFeedback({ kind: "success", message: editor?.mode === "create" ? `Table ${table.tableNumber} created successfully.` : `Table ${table.tableNumber} updated successfully.` });
    if (editor?.mode === "create") resetFilters();
    setEditor(null);
  }
  async function toggleTable(table: AdminTable) {
    if (requests.current.has(table.id)) return;
    const controller = new AbortController();
    requests.current.set(table.id, controller);
    setBusyIds(new Set(requests.current.keys()));
    setFeedback(null);
    try {
      const saved = await updateAdminTable(accessToken ?? "", table.id, { isActive: !table.isActive }, controller.signal);
      if (controller.signal.aborted) return;
      pendingLoadMutations.current?.set(saved.id, saved);
      setTables((current) => current.map((item) => item.id === saved.id ? saved : item));
      setFeedback({ kind: "success", message: `Table ${saved.tableNumber} ${saved.isActive ? "activated" : "deactivated"}.` });
    } catch (error) {
      if (!controller.signal.aborted && !handleAuthorizationError(error)) setFeedback({ kind: "error", message: getTableError(error) });
    } finally {
      requests.current.delete(table.id);
      if (!controller.signal.aborted) setBusyIds(new Set(requests.current.keys()));
    }
  }

  const searchInput = <div className="admin-search">
    <Search aria-hidden="true" />
    <input type="search" aria-label="Search tables by number or location" placeholder="Search tables by number or location..." value={query} onChange={(event) => setQuery(event.target.value)} />
    {query && <button className="admin-search-clear" aria-label="Clear search" onClick={() => setQuery("")}><X aria-hidden="true" /></button>}
  </div>;

  return <AdminLayout search={searchInput}>
    <div className="admin-page-header">
      <div><h1>Table Management</h1><p>Manage your restaurant tables and their details.</p></div>
      <Button ref={addButton} className="admin-primary-button admin-add-button" onClick={() => setEditor({ mode: "create" })}><Plus aria-hidden="true" />Add Table</Button>
    </div>
    <div className="admin-content">
      <div className="admin-mobile-search">{searchInput}</div>
      <div className="admin-filters">
        <div className="admin-status-filters" role="group" aria-label="Filter tables by status">
          {(["all", "active", "inactive"] as const).map((filter) => <button key={filter} className={`admin-filter admin-filter-${filter}`} aria-pressed={status === filter} onClick={() => setStatus(filter)}>
            {filter[0].toUpperCase() + filter.slice(1)}{!loading && !loadError && <span>({counts[filter]})</span>}
          </button>)}
        </div>
        <Select value={selectedArea} onValueChange={(value) => setArea(value ?? "")}>
          <SelectTrigger className="admin-area-filter" aria-label="Filter tables by area"><SelectValue>{selectedArea || "All Areas"}</SelectValue></SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            <SelectItem value="">All Areas</SelectItem>
            {locations.map((location) => <SelectItem key={location} value={location}>{location}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {feedback && <div className={`admin-feedback ${feedback.kind === "error" ? "is-error" : "is-success"}`} role={feedback.kind === "error" ? "alert" : "status"}>
        {feedback.kind === "error" ? <CircleAlert aria-hidden="true" /> : <CircleCheck aria-hidden="true" />}<p>{feedback.message}</p>
        <button aria-label="Dismiss message" onClick={() => setFeedback(null)}><X aria-hidden="true" /></button>
      </div>}
      {loading ? <div role="status" aria-label="Loading tables"><span className="sr-only">Loading tables…</span><div className="admin-table-grid" aria-hidden="true">{Array.from({ length: 8 }, (_, index) => <div className="admin-table-skeleton" key={index}><span /><span /><span /><span /></div>)}</div></div>
        : loadError ? <div className="admin-empty-state" role="alert"><div className="admin-empty-icon is-error"><CircleAlert aria-hidden="true" /></div><h2>Unable to load tables</h2><p>{loadError}</p><Button className="admin-primary-button" onClick={retry}><RotateCw aria-hidden="true" />Try again</Button></div>
        : tables.length === 0 ? <div className="admin-empty-state"><div className="admin-empty-icon"><DiningTableIcon aria-hidden="true" /></div><h2>A place for every guest</h2><p>Add your first table to start organizing your restaurant.</p><Button className="admin-primary-button" onClick={() => setEditor({ mode: "create" })}><Plus aria-hidden="true" />Add your first table</Button></div>
        : filteredTables.length === 0 ? <div className="admin-empty-state"><div className="admin-empty-icon"><Search aria-hidden="true" /></div><h2>No tables found</h2><p>Try a different search or adjust your filters.</p><Button className="admin-secondary-button" variant="outline" onClick={resetFilters}>Clear filters</Button></div>
        : <><div className="admin-table-grid">{filteredTables.map((table) => <TableCard key={table.id} table={table} busy={busyIds.has(table.id)} onEdit={(selected) => setEditor({ mode: "edit", table: selected })} onToggle={(selected) => void toggleTable(selected)} />)}</div><p className="admin-results-count" role="status">Showing {filteredTables.length} of {tables.length} {tables.length === 1 ? "table" : "tables"}<span aria-hidden="true">·</span>{filteredTables.reduce((sum, table) => sum + table.capacity, 0)} seats</p></>}
    </div>
    <Dialog open={editor !== null} onOpenChange={(open) => { if (!open && !saving) setEditor(null); }} disablePointerDismissal={saving}>
      <DialogContent className="admin-table-dialog" showCloseButton={!saving} finalFocus={addButton}>
        <DialogHeader><DialogTitle>{editor?.mode === "edit" ? "Edit Table" : "Add Table"}</DialogTitle><DialogDescription>{editor?.mode === "edit" ? "Update the details for this table." : "Enter the details for the new table."}</DialogDescription></DialogHeader>
        {editor && <TableForm key={editor.mode === "edit" ? editor.table.id : "create"} {...editor} onSaved={savedTable} onCancel={() => setEditor(null)} onBusyChange={setSaving} onAuthorizationError={handleAuthorizationError} />}
      </DialogContent>
    </Dialog>
  </AdminLayout>;
}
