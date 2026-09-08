import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ButtonPrimary } from "@/components/smady/Button";
import type { Lead, LeadStatus } from "@/types";

const statuses: LeadStatus[] = ["New", "Contacted", "Interested", "Meeting Booked", "Verified", "Churned"];
const priorities = ["High", "Medium", "Low"];

export function EditLeadModal({
  lead,
  open,
  onOpenChange,
  onSave,
}: {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (id: string, patch: Partial<Lead>) => Promise<void>;
}) {
  const [form, setForm] = useState<Partial<Lead> | null>(null);
  const [saving, setSaving] = useState(false);

  if (!lead) return null;
  const values = form ?? lead;

  const set = (key: keyof Lead, value: string) => setForm({ ...values, [key]: value });

  const handleSave = async () => {
    if (!form) return onOpenChange(false);
    setSaving(true);
    await onSave(lead.id, form);
    setSaving(false);
    setForm(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setForm(null); onOpenChange(v); }}>
      <DialogContent className="max-w-md" data-testid="edit-lead-modal">
        <DialogHeader>
          <DialogTitle>Edit Lead</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Input data-testid="edit-lead-name-input" placeholder="Name" value={values.name} onChange={(e) => set("name", e.target.value)} />
          <Input data-testid="edit-lead-title-input" placeholder="Title" value={values.title} onChange={(e) => set("title", e.target.value)} />
          <Input data-testid="edit-lead-company-input" placeholder="Company" value={values.company} onChange={(e) => set("company", e.target.value)} className="col-span-2" />
          <Input data-testid="edit-lead-email-input" placeholder="Email" value={values.email} onChange={(e) => set("email", e.target.value)} className="col-span-2" />
          <Input data-testid="edit-lead-phone-input" placeholder="Phone" value={values.phone || ""} onChange={(e) => set("phone", e.target.value)} className="col-span-2" />
          <Select value={values.status} onValueChange={(v) => set("status", v)}>
            <SelectTrigger data-testid="edit-lead-status-select">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={values.priority || "Medium"} onValueChange={(v) => set("priority", v)}>
            <SelectTrigger data-testid="edit-lead-priority-select">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              {priorities.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ButtonPrimary fullWidth loading={saving} onClick={handleSave} data-testid="edit-lead-save-button">
          Save Changes
        </ButtonPrimary>
      </DialogContent>
    </Dialog>
  );
}
