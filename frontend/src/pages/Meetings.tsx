import { useState } from "react";
import { ExternalLink, Plus } from "lucide-react";
import { PageHeader } from "@/layouts/PageHeader";
import { CalendarBlock } from "@/components/smady/CalendarBlock";
import { ButtonPrimary } from "@/components/smady/Button";
import { AvatarInitial } from "@/components/smady/AvatarStack";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/smady/SearchableSelect";
import { useAppData } from "@/context/AppDataContext";
import { leadPool } from "@/mock/leads";
import { toast } from "@/components/ui/sonner";

const legend = [
  { label: "Confirmed", color: "bg-success" },
  { label: "Pending Reply", color: "bg-amber-500" },
  { label: "Auto-Booked by Agent", color: "bg-primary-500" },
];

export default function Meetings() {
  const { meetings, addMeeting } = useAppData();
  const [open, setOpen] = useState(false);
  const [leadId, setLeadId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");

  const upcoming = [...meetings]
    .filter((m) => new Date(m.date) >= new Date(new Date().toDateString()))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);

  const onConfirm = () => {
    const lead = leadPool.find((l) => l.id === leadId);
    if (!lead || !date || !time) {
      toast.error("Please fill in all fields");
      return;
    }
    addMeeting({ leadName: lead.name, company: lead.company, date, time, status: "Confirmed", link: notes || "https://meet.smady.ai/new" });
    setOpen(false);
    setLeadId("");
    setDate("");
    setTime("");
    setNotes("");
    toast.success("Meeting scheduled");
  };

  return (
    <div data-testid="meetings-page">
      <PageHeader />
      <div className="mb-5 flex flex-wrap gap-3">
        {legend.map((l) => (
          <span key={l.label} className="flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-body shadow-card">
            <span className={`h-2 w-2 rounded-full ${l.color}`} />
            {l.label}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[7fr_3fr]">
        <CalendarBlock meetings={meetings} />
        <div className="rounded-2xl bg-surface p-5 shadow-card">
          <h2 className="text-[15px] font-semibold text-ink">Upcoming Meetings</h2>
          <div className="mt-4 space-y-3">
            {upcoming.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-xl border border-border p-3" data-testid={`upcoming-meeting-${m.id}`}>
                <AvatarInitial name={m.leadName} size={32} />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ink">{m.leadName}</p>
                  <p className="text-xs text-muted">
                    {m.company} · {m.date} · {m.time}
                  </p>
                </div>
                <a href={m.link} target="_blank" rel="noreferrer" className="text-primary-500" data-testid={`join-meeting-${m.id}`}>
                  <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
                </a>
              </div>
            ))}
            {upcoming.length === 0 && <p className="text-sm text-muted">No upcoming meetings.</p>}
          </div>
          <ButtonPrimary fullWidth className="mt-5" icon={<Plus className="h-4 w-4" strokeWidth={1.5} />} onClick={() => setOpen(true)} data-testid="schedule-meeting-button">
            Schedule Meeting Manually
          </ButtonPrimary>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="schedule-meeting-modal">
          <DialogHeader>
            <DialogTitle>Schedule Meeting</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">Select Lead</label>
              <SearchableSelect
                options={leadPool.map((l) => ({ label: l.name, value: l.id, subtitle: l.company }))}
                value={leadId}
                onChange={setLeadId}
                placeholder="Search leads..."
                testId="meeting-lead-select"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">Date</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} data-testid="meeting-date-input" />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">Time</label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} data-testid="meeting-time-input" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">Meeting Link / Notes</label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="https://meet.smady.ai/..." data-testid="meeting-notes-input" />
            </div>
            <ButtonPrimary fullWidth onClick={onConfirm} data-testid="meeting-confirm-button">
              Confirm Meeting
            </ButtonPrimary>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
