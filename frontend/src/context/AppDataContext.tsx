import React, { createContext, useContext, useState, ReactNode } from "react";
import type { Lead, Campaign, Meeting, Proposal, ICPResult } from "@/types";
import { leadPool } from "@/mock/leads";
import { campaignsMock } from "@/mock/campaigns";
import { meetingsMock } from "@/mock/meetings";
import { proposalsMock } from "@/mock/proposals";
import { defaultIcpResult } from "@/mock/icp";

let idCounter = 1000;
const nextId = (prefix: string) => `${prefix}-${idCounter++}`;

interface AppDataContextType {
  icp: ICPResult | null;
  generatingIcp: boolean;
  generateIcp: (input: Record<string, unknown>) => Promise<void>;

  leads: Lead[];
  generatingLeads: boolean;
  generateLeads: (filters: Record<string, unknown>) => Promise<void>;
  uploadLeads: (count: number) => void;
  sendToOutreach: (ids: string[]) => void;

  campaigns: Campaign[];
  addCampaign: (data: { name: string; leadsCount: number; subject: string; body: string }) => void;

  meetings: Meeting[];
  addMeeting: (m: Omit<Meeting, "id">) => void;

  proposals: Proposal[];
  generatingProposal: boolean;
  generateProposal: (data: { leadName: string; company: string; notes: string }) => Promise<void>;
  approveProposal: (id: string) => void;
  rejectProposal: (id: string) => void;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [icp, setIcp] = useState<ICPResult | null>(null);
  const [generatingIcp, setGeneratingIcp] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [generatingLeads, setGeneratingLeads] = useState(false);
  const [poolIndex, setPoolIndex] = useState(0);
  const [campaigns, setCampaigns] = useState<Campaign[]>(campaignsMock);
  const [meetings, setMeetings] = useState<Meeting[]>(meetingsMock);
  const [proposals, setProposals] = useState<Proposal[]>(proposalsMock);
  const [generatingProposal, setGeneratingProposal] = useState(false);

  const generateIcp = async (_input: Record<string, unknown>) => {
    setGeneratingIcp(true);
    await new Promise((r) => setTimeout(r, 1800));
    setIcp(defaultIcpResult);
    setGeneratingIcp(false);
  };

  const generateLeads = async (_filters: Record<string, unknown>) => {
    setGeneratingLeads(true);
    await new Promise((r) => setTimeout(r, 1800));
    const start = poolIndex % leadPool.length;
    const batch = [...leadPool.slice(start, start + 6), ...leadPool.slice(0, Math.max(0, start + 6 - leadPool.length))].map((l) => ({
      ...l,
      id: nextId("lead"),
    }));
    setPoolIndex((p) => p + 6);
    setLeads((prev) => [...batch, ...prev]);
    setGeneratingLeads(false);
  };

  const uploadLeads = (count: number) => {
    const batch = leadPool.slice(0, count).map((l) => ({ ...l, id: nextId("lead"), source: "Uploaded" as const }));
    setLeads((prev) => [...batch, ...prev]);
  };

  const sendToOutreach = (ids: string[]) => {
    setLeads((prev) => prev.map((l) => (ids.includes(l.id) ? { ...l, status: "Contacted" as const } : l)));
  };

  const addCampaign = (data: { name: string; leadsCount: number; subject: string; body: string }) => {
    const campaign: Campaign = {
      id: nextId("camp"),
      requestId: `#REQ-${1042 + campaigns.length}`,
      name: data.name,
      leadsCount: data.leadsCount,
      status: "Queued",
      sentDate: new Date().toISOString().slice(0, 10),
      subject: data.subject,
      body: data.body,
    };
    setCampaigns((prev) => [campaign, ...prev]);
  };

  const addMeeting = (m: Omit<Meeting, "id">) => {
    setMeetings((prev) => [{ ...m, id: nextId("meet") }, ...prev]);
  };

  const generateProposal = async (data: { leadName: string; company: string; notes: string }) => {
    setGeneratingProposal(true);
    await new Promise((r) => setTimeout(r, 1800));
    const proposal: Proposal = {
      id: nextId("prop"),
      leadName: data.leadName,
      company: data.company,
      generatedDate: new Date().toISOString().slice(0, 10),
      status: "Needs Review",
      content: `Hi ${data.leadName.split(" ")[0]}, based on our conversation with ${data.company}, we propose a tailored Smady outbound package covering ICP refinement, automated sourcing, and meeting scheduling. ${data.notes}`,
    };
    setProposals((prev) => [proposal, ...prev]);
    setGeneratingProposal(false);
  };

  const approveProposal = (id: string) =>
    setProposals((prev) => prev.map((p) => (p.id === id ? { ...p, status: "Approved" as const } : p)));
  const rejectProposal = (id: string) => setProposals((prev) => prev.filter((p) => p.id !== id));

  return (
    <AppDataContext.Provider
      value={{
        icp,
        generatingIcp,
        generateIcp,
        leads,
        generatingLeads,
        generateLeads,
        uploadLeads,
        sendToOutreach,
        campaigns,
        addCampaign,
        meetings,
        addMeeting,
        proposals,
        generatingProposal,
        generateProposal,
        approveProposal,
        rejectProposal,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
