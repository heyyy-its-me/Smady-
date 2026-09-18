import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ButtonPrimary } from "@/components/smady/Button";
import { RunHistoryPicker } from "@/components/smady/RunHistoryPicker";
import { useAppData } from "@/context/AppDataContext";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/sonner";

interface SendCampaignCardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLeadIds?: string[];
  onSuccess?: () => void;
  title?: string;
  subtitle?: string;
}

export function SendCampaignCard({
  open,
  onOpenChange,
  selectedLeadIds = [],
  onSuccess,
  title = "Send Campaign",
  subtitle,
}: SendCampaignCardProps) {
  const { addCampaign } = useAppData();
  const [recipientSource, setRecipientSource] = useState<"selected" | "all" | "run">(
    selectedLeadIds.length > 0 ? "selected" : "all"
  );
  const [runId, setRunId] = useState<string | null>(null);
  const [runLeadCount, setRunLeadCount] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("Hi {first_name}, ...");
  const [scheduled, setScheduled] = useState(false);
  const [sending, setSending] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setRecipientSource(selectedLeadIds.length > 0 ? "selected" : "all");
      setName("");
      setSubject("");
      setBody("Hi {first_name}, ...");
      setScheduled(false);
      setRunId(null);
      setRunLeadCount(null);
    }
  }, [open, selectedLeadIds.length]);

  const onSelectRun = async (id: string) => {
    setRunId(id);
    try {
      const { data } = await api.get(`/leads?run_id=${id}&limit=1`);
      setRunLeadCount(data.total);
    } catch (_e) {
      toast.error("Failed to load lead count");
    }
  };

  const onSend = async () => {
    if (!name.trim()) {
      toast.error("Campaign name is required");
      return;
    }
    if (!subject.trim()) {
      toast.error("Subject line is required");
      return;
    }

    setSending(true);
    try {
      await addCampaign({
        name: name || "Untitled Campaign",
        subject,
        body,
        recipientSource: recipientSource === "selected" ? "selected" : recipientSource,
        runId: recipientSource === "run" ? runId ?? undefined : undefined,
        selectedLeadIds: recipientSource === "selected" ? selectedLeadIds : undefined,
      });
      setSending(false);
      onOpenChange(false);
      toast.success("Campaign created successfully!");
      onSuccess?.();
    } catch (error) {
      setSending(false);
      toast.error("Failed to create campaign");
      console.error(error);
    }
  };

  const isValid =
    name.trim() &&
    subject.trim() &&
    (recipientSource === "all" || recipientSource === "selected" || runId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="send-campaign-modal" className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {subtitle && <p className="text-xs text-muted mt-1">{subtitle}</p>}
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipient Source */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">
              Recipient Source
            </label>
            <select
              value={recipientSource}
              onChange={(e) => {
                setRecipientSource(e.target.value as "selected" | "all" | "run");
                if (e.target.value !== "run") {
                  setRunId(null);
                  setRunLeadCount(null);
                }
              }}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm text-ink"
              data-testid="campaign-recipient-source-select"
            >
              {selectedLeadIds.length > 0 && (
                <option value="selected">
                  Selected leads ({selectedLeadIds.length})
                </option>
              )}
              <option value="all">All leads (every execution, ever)</option>
              <option value="run">From a specific execution</option>
            </select>
          </div>

          {/* Run Picker */}
          {recipientSource === "run" && (
            <div
              className="space-y-2 rounded-xl border border-primary-100/70 bg-primary-50/40 p-3.5"
              data-testid="campaign-run-picker-wrapper"
            >
              <p className="text-xs text-muted">
                Pick which lead-generation run to target — even ones from days ago.
              </p>
              <RunHistoryPicker selectedRunId={runId} onSelect={onSelectRun} />
              {runId && (
                <p
                  className="text-sm font-semibold text-primary-700"
                  data-testid="campaign-run-lead-count"
                >
                  {runLeadCount === null
                    ? "Loading..."
                    : `${runLeadCount} lead(s) will be contacted from this run`}
                </p>
              )}
            </div>
          )}

          {/* Campaign Name */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">
              Campaign Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Q3 SaaS VP Outreach"
              data-testid="campaign-name-input"
            />
          </div>

          {/* Subject Line */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">
              Subject Line
            </label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Quick question about {company}"
              data-testid="campaign-subject-input"
            />
          </div>

          {/* Body */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">
              Body
            </label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              data-testid="campaign-body-textarea"
            />
          </div>

          {/* Schedule Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
            <span className="text-sm text-body">
              {scheduled ? "Schedule for later" : "Send Now"}
            </span>
            <Switch
              checked={scheduled}
              onCheckedChange={setScheduled}
              data-testid="campaign-schedule-toggle"
            />
          </div>

          {/* Send Button */}
          <ButtonPrimary
            fullWidth
            loading={sending}
            disabled={!isValid}
            onClick={onSend}
            data-testid="campaign-send-button"
          >
            Send Campaign
          </ButtonPrimary>
        </div>
      </DialogContent>
    </Dialog>
  );
}
