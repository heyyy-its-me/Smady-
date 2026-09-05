import { useState } from "react";
import moment from "moment";
import { Calendar, momentLocalizer, View, Views } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Meeting } from "@/types";

const localizer = momentLocalizer(moment);

const statusColor: Record<string, string> = {
  Confirmed: "#22C55E",
  "Pending Reply": "#D97706",
  "Auto-Booked": "#F9622C",
};

function CustomToolbar(toolbar: any) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => toolbar.onNavigate("PREV")}
          data-testid="calendar-prev-button"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-body transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <button
          onClick={() => toolbar.onNavigate("TODAY")}
          data-testid="calendar-today-button"
          className="rounded-full border border-border px-4 py-1.5 text-xs font-semibold text-body transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600"
        >
          Today
        </button>
        <button
          onClick={() => toolbar.onNavigate("NEXT")}
          data-testid="calendar-next-button"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-body transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <span className="ml-2 text-[15px] font-bold text-ink">{toolbar.label}</span>
      </div>
      <div className="flex items-center gap-1 rounded-full bg-bg p-1">
        {toolbar.views.map((v: string) => (
          <button
            key={v}
            onClick={() => toolbar.onView(v)}
            data-testid={`calendar-view-${v.toLowerCase()}`}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors",
              toolbar.view === v ? "bg-primary-500 text-white shadow-soft" : "text-body hover:text-ink",
            )}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CalendarBlock({ meetings }: { meetings: Meeting[] }) {
  const [view, setView] = useState<View>(Views.MONTH);
  const events = meetings.map((m) => {
    const start = new Date(m.meeting_date);
    return { id: m.id, title: m.lead_name, start, end: start, status: m.status, source: m.source };
  });

  return (
    <div className="rounded-2xl bg-surface p-5 shadow-card" data-testid="meeting-calendar-block">
      <Calendar
        localizer={localizer}
        events={events}
        view={view}
        onView={setView}
        views={[Views.MONTH, Views.WEEK]}
        onDrillDown={() => {}}
        style={{ height: 600 }}
        components={{ toolbar: CustomToolbar }}
        eventPropGetter={(event: any) => ({
          style: {
            backgroundColor: statusColor[event.status] || "#F9622C",
            borderRadius: "999px",
            border: "none",
            color: "white",
            fontSize: "11px",
            fontWeight: 600,
            padding: "3px 10px",
          },
        })}
      />
    </div>
  );
}
