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

interface ICP {
  request_id: string;
  company_name: string;
  product_name: string;
  product_description?: string;
  created_at: string;
  result?: any;
}

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
  
  // ICP-related state
  const [icps, setIcps] = useState<ICP[]>([]);
  const [selectedIcpId, setSelectedIcpId] = useState<string | null>(null);
  const [loadingIcps, setLoadingIcps] = useState(false);
  
  const [companyName, setCompanyName] = useState("Smady");
  const [productName, setProductName] = useState("Smady Outreach");
  const [productDescription, setProductDescription] = useState("");
  const [name, setName] = useState("");
  const [body, setBody] = useState("Hi {first_name}, ...");
  const [sending, setSending] = useState(false);

  // Fetch ICPs when dialog opens
  useEffect(() => {
    if (open) {
      fetchICPs();
    }
  }, [open]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setRecipientSource(selectedLeadIds.length > 0 ? "selected" : "all");
      setSelectedIcpId(null);
      setCompanyName("Smady");
      setProductName("Smady Outreach");
      setProductDescription("");
      setName("");
      setBody("Hi {first_name}, ...");
      setRunId(null);
      setRunLeadCount(null);
    }
  }, [open, selectedLeadIds.length]);

  const fetchICPs = async () => {
    setLoadingIcps(true);
    try {
      const { data } = await api.get("/icp/list");
      setIcps(data);
    } catch (error) {
      console.error("Failed to fetch ICPs", error);
      setIcps([]);
    } finally {
      setLoadingIcps(false);
    }
  };

  const onSelectICP = (icpId: string) => {
    setSelectedIcpId(icpId);
    const icp = icps.find((i) => i.request_id === icpId);
    if (icp) {
      setCompanyName(icp.company_name || "Smady");
      setProductName(icp.product_name || "Smady Outreach");
      // Extract product description from result if available
      const description = icp.result?.positioning || "";
      setProductDescription(description);
    }
  };

  const onSelectRun = async (id: string) => {
    setRunId(id);
    try {
      // CHANGED: Ensure we get the correct total count for this specific run
      const { data } = await api.get(`/leads?run_id=${id}&limit=1&offset=0`);
      if (!data.total || data.total === 0) {
        toast.warning("No leads found in this execution");
        setRunLeadCount(0);
      } else {
        setRunLeadCount(data.total);
      }
    } catch (_e) {
      toast.error("Failed to load lead count for this execution");
      setRunLeadCount(null);
    }
  };

  const onSend = async () => {
    if (!name.trim()) {
      toast.error("Campaign name is required");
      return;
    }
    if (!companyName.trim()) {
      toast.error("Company name is required");
      return;
    }
    if (!productName.trim()) {
      toast.error("Product name is required");
      return;
    }

    setSending(true);
    try {
      await addCampaign({
        name: name || "Untitled Campaign",
        body,
        companyName,
        productName,
        productDescription,
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
    companyName.trim() &&
    productName.trim() &&
    (recipientSource === "all" || recipientSource === "selected" || runId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="send-campaign-modal" className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {subtitle && <p className="text-xs text-muted mt-1">{subtitle}</p>}
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto flex-1 pr-4 -mr-4">
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

          {/* ICP Selector */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">
              Use ICP Profile (Optional)
            </label>
            <select
              value={selectedIcpId || ""}
              onChange={(e) => {
                const icpId = e.target.value;
                if (icpId) {
                  onSelectICP(icpId);
                } else {
                  setSelectedIcpId(null);
                }
              }}
              disabled={loadingIcps}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="campaign-icp-selector"
            >
              <option value="">
                {loadingIcps ? "Loading ICPs..." : "Select an ICP profile to populate fields..."}
              </option>
              {icps.map((icp) => (
                <option key={icp.request_id} value={icp.request_id}>
                  {icp.product_name} ({icp.company_name}) - {new Date(icp.created_at).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>

          {/* Company Name */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">
              Company Name
            </label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Smady"
              data-testid="campaign-company-name-input"
            />
          </div>

          {/* Product Name */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">
              Product Name
            </label>
            <Input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Smady Outreach"
              data-testid="campaign-product-name-input"
            />
          </div>

          {/* Product Description */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">
              Product Description (Optional)
            </label>
            <Textarea
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              placeholder="What does your product do? (Used in email personalization)"
              data-testid="campaign-product-description-input"
              rows={1}
            />
          </div>

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

          {/* Body */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">
              Body
            </label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={2}
              data-testid="campaign-body-textarea"
            />
          </div>
        </div>

        {/* Send Button - Fixed at bottom */}
        <div className="border-t border-border pt-3 mt-3">
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
