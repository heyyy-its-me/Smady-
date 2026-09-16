import { useState } from "react";
import { ExternalLink, Plus } from "lucide-react";
import { PageHeader } from "@/layouts/PageHeader";
import { CalendarBlock } from "@/components/smady/CalendarBlock";
import { ButtonPrimary } from "@/components/smady/Button";
import { AvatarInitial } from "@/components/smady/AvatarStack";
import { TimePickerInput } from "@/components/smady/TimePickerInput";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAppData } from "@/context/AppDataContext";
import { toast } from "@/components/ui/sonner";

const legend = [
  { label: "Scheduled", color: "bg-success" },
  { label: "Pending Reply", color: "bg-amber-500" },
  { label: "Confirmed", color: "bg-blue-500" },
  { label: "Auto-Booked by Agent", color: "bg-primary-500" },
  { label: "Failed", color: "bg-red-500" },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "Scheduled":
      return "bg-success text-success-dark";
    case "Pending Reply":
      return "bg-amber-100 text-amber-800";
    case "Confirmed":
      return "bg-blue-100 text-blue-800";
    case "Auto-Booked":
      return "bg-primary-100 text-primary-800";
    case "Failed":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

// Helper: get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

export default function Meetings() {
  const { meetings, scheduleMeeting } = useAppData();
  const [open, setOpen] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState(""); // HH:mm 24hr IST
  const [duration, setDuration] = useState("30");
  const [title, setTitle] = useState("Discovery Call");
  const [link, setLink] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const upcoming = [...meetings]
    .filter((m) => new Date(m.meeting_date) >= new Date(new Date().toDateString()))
    .sort((a, b) => a.meeting_date.localeCompare(b.meeting_date))
    .slice(0, 6);

  const onConfirm = async () => {
    if (!leadName || !leadEmail || !date || !time) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate that date is not in the past
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      toast.error("Meeting date cannot be in the past");
      return;
    }

    // Validate time format HH:mm
    if (!/^\d{2}:\d{2}$/.test(time)) {
      toast.error("Time must be in HH:mm format (e.g. 14:30)");
      return;
    }
    setSubmitting(true);
    try {
      await scheduleMeeting({
        lead_name: leadName,
        lead_email: leadEmail,
        meeting_date: date,        // YYYY-MM-DD only — backend combines with meeting_time
        meeting_time: time,        // HH:mm 24hr IST
        duration: parseInt(duration, 10) || 30,
        title: title || "Discovery Call",
        meeting_link: link || undefined,
        notes: notes || undefined,
      });
      setOpen(false);
      setLeadName(""); setLeadEmail(""); setDate(""); setTime("");
      setDuration("30"); setTitle("Discovery Call"); setLink(""); setNotes("");
      toast.success("Meeting scheduled");
    } catch {
      // error toast already shown by context
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div data-testid="meetings-page">
      <PageHeader />
      <div className="mb-5 flex flex-wrap gap-3" data-testid="meetings-legend">
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
                <AvatarInitial name={m.lead_name} size={32} />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ink">{m.lead_name}</p>
                  <p className="text-xs text-muted">
                    {new Date(m.meeting_date).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                    {m.source === "agent" && <span className="ml-1.5 font-semibold text-primary-600">· Auto-booked</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(m.status)}`}>
                    {m.status}
                  </span>
                  {m.meeting_link && m.status === "Scheduled" && (
                    <a href={m.meeting_link} target="_blank" rel="noreferrer" className="text-primary-500" data-testid={`join-meeting-${m.id}`}>
                      <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
                    </a>
                  )}
                </div>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">Client Name *</label>
                <Input value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="Jordan Blake" data-testid="meeting-lead-name-input" />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">Client Email *</label>
                <Input type="email" value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} placeholder="jordan@company.com" data-testid="meeting-lead-email-input" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">Meeting Date *</label>
                <Input 
                  type="date" 
                  value={date} 
                  onChange={(e) => {
                    const selectedDate = new Date(e.target.value);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    if (selectedDate >= today) {
                      setDate(e.target.value);
                    } else {
                      toast.error("Meeting date cannot be in the past");
                    }
                  }} 
                  min={getTodayDate()} 
                  data-testid="meeting-date-input" 
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">Meeting Time (IST) *</label>
                <TimePickerInput value={time} onChange={setTime} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">Duration (minutes)</label>
                <Input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="30"
                  min={5}
                  max={240}
                  data-testid="meeting-duration-input"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">Meeting Title</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Discovery Call" data-testid="meeting-title-input" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">Notes / Description</label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything to prepare for this meeting..." data-testid="meeting-notes-input" />
            </div>
            <ButtonPrimary fullWidth loading={submitting} onClick={onConfirm} data-testid="meeting-confirm-button">
              Confirm Meeting
            </ButtonPrimary>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
