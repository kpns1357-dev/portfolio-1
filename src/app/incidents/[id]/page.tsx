"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  MapPin,
  Clock,
  Building,
  Users,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Camera,
  MessageSquare,
  ShieldCheck,
  Send,
  Upload,
  ArrowLeft,
  Share2,
  FileCheck2,
  RotateCcw,
} from "lucide-react";
import { PriorityBadge } from "@/components/PriorityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { SlaBadge } from "@/components/SlaBadge";
import { IncidentTimeline } from "@/components/IncidentTimeline";
import { BeforeAfterEvidence } from "@/components/BeforeAfterEvidence";
import { IncidentGraph } from "@/components/IncidentGraph";

export default function IncidentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [incident, setIncident] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Verification Form State
  const [verifying, setVerifying] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("STILL_EXISTS");
  const [rejectionNotes, setRejectionNotes] = useState("");
  const [rejectionProofUrl, setRejectionProofUrl] = useState("");

  // Authority Action State
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [statusChangeTarget, setStatusChangeTarget] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [evidenceUploadUrl, setEvidenceUploadUrl] = useState("");
  const [evidenceTypeToUpload, setEvidenceTypeToUpload] = useState<"INSPECTION" | "REPAIR">("REPAIR");
  const [evidenceNotes, setEvidenceNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Comment State
  const [commentText, setCommentText] = useState("");
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);

  const fetchIncident = async () => {
    try {
      const res = await fetch(`/api/incidents/${id}`);
      if (res.ok) {
        const data = await res.json();
        setIncident(data.incident);
        if (data.incident.departmentId) {
          setSelectedDept(data.incident.departmentId);
        }
      }
    } catch (err) {
      console.error("Fetch incident error", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionAndDepts = async () => {
    try {
      const [userRes, deptRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/departments"),
      ]);
      if (userRes.ok) {
        const u = await userRes.json();
        setCurrentUser(u.user);
      }
      if (deptRes.ok) {
        const d = await deptRes.json();
        setDepartments(d.departments || []);
      }
    } catch {}
  };

  useEffect(() => {
    fetchIncident();
    fetchSessionAndDepts();
  }, [id]);

  // Citizen Confirmation handler
  const handleConfirmResolution = async () => {
    setVerifying(true);
    try {
      const res = await fetch(`/api/incidents/${incident.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmed: true,
          citizenNotes: "Citizen confirmed repaired on-site.",
        }),
      });
      if (res.ok) {
        await fetchIncident();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setVerifying(false);
    }
  };

  // Citizen Rejection handler
  const handleRejectResolution = async () => {
    setVerifying(true);
    try {
      const res = await fetch(`/api/incidents/${incident.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmed: false,
          rejectionReason,
          citizenNotes: rejectionNotes,
          evidenceUrl: rejectionProofUrl || undefined,
        }),
      });
      if (res.ok) {
        setShowRejectModal(false);
        await fetchIncident();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setVerifying(false);
    }
  };

  // Authority Assign Team
  const handleAssignTeam = async () => {
    if (!selectedTeam || !selectedDept) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/incidents/${incident.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: selectedTeam,
          departmentId: selectedDept,
          notes: "Operational assignment updated via command console.",
        }),
      });
      if (res.ok) {
        await fetchIncident();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Authority Change Status
  const handleStatusChange = async () => {
    if (!statusChangeTarget) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/incidents/${incident.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toStatus: statusChangeTarget,
          reason: statusReason || undefined,
        }),
      });
      if (res.ok) {
        setStatusChangeTarget("");
        setStatusReason("");
        await fetchIncident();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Upload Inspection or Repair Evidence
  const handleUploadEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceUploadUrl) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/incidents/${incident.id}/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: evidenceUploadUrl,
          evidenceType: evidenceTypeToUpload,
          notes: evidenceNotes,
          filename: `${evidenceTypeToUpload.toLowerCase()}_proof.jpg`,
        }),
      });
      if (res.ok) {
        setEvidenceUploadUrl("");
        setEvidenceNotes("");
        await fetchIncident();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Post Comment
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setCommentLoading(true);
    try {
      const res = await fetch(`/api/incidents/${incident.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: commentText,
          isInternal: isInternalComment,
        }),
      });
      if (res.ok) {
        setCommentText("");
        await fetchIncident();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCommentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-400 font-medium">
          Retrieving complete municipal case dossier...
        </p>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h2 className="text-lg font-bold text-slate-800">Case Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">
          The requested case ID does not exist or may have been archived.
        </p>
        <Link
          href="/incidents"
          className="mt-4 inline-block px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
        >
          Return to Registry
        </Link>
      </div>
    );
  }

  const isStaff = currentUser && ["AUTHORITY", "MODERATOR", "SUPER_ADMIN"].includes(currentUser.role);
  const activeDept = departments.find((d) => d.id === selectedDept);
  const priorityBreakdown = incident.priorityBreakdown;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/incidents"
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Cases
        </Link>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 font-mono">
            Created: {new Date(incident.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* HEADER DOSSIER CARD */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <span className="text-sm sm:text-base font-mono font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
              {incident.caseId}
            </span>
            <div className="flex items-center space-x-2">
              <PriorityBadge
                score={incident.priorityScore}
                label={incident.priorityLabel}
                size="md"
              />
              <StatusBadge status={incident.status} size="md" />
            </div>
          </div>

          <SlaBadge
            slaStatus={incident.slaStatus}
            statusText={incident.slaInfo?.statusText}
            size="md"
          />
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {incident.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed max-w-4xl">
            {incident.description}
          </p>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Location / Area
            </span>
            <span className="text-slate-800 font-medium flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
              {incident.address}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Category
            </span>
            <span className="text-slate-800 font-medium mt-0.5 block">
              {incident.category?.name || "General"}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Assigned Department
            </span>
            <span className="text-slate-800 font-medium mt-0.5 block">
              {incident.department?.name || "Unassigned"}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Dispatched Team
            </span>
            <span className="text-slate-800 font-medium mt-0.5 block">
              {incident.team?.name || "Pending Dispatch"}
            </span>
          </div>
        </div>
      </div>

      {/* CITIZEN RESOLUTION VERIFICATION BANNER */}
      {incident.status === "VERIFICATION_PENDING" && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/70 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                <h3 className="text-sm font-bold text-amber-950 uppercase tracking-wide">
                  The Municipal Authority Marked This Incident As Resolved
                </h3>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed">
                Please inspect the before & after evidence below. As a citizen, you have the final authority to confirm or reject this claim.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleConfirmResolution}
                disabled={verifying}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{verifying ? "Confirming..." : "YES, FIXED"}</span>
              </button>

              <button
                onClick={() => setShowRejectModal(true)}
                disabled={verifying}
                className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <XCircle className="w-4 h-4" />
                <span>NOT FIXED</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION MODAL */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-lg w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Reject Claimed Resolution & Reopen Incident
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Help the municipal team understand why this problem is not yet resolved.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Primary Reason for Rejection *
                </label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="STILL_EXISTS">Problem still exists</option>
                  <option value="PARTIALLY_FIXED">Partially fixed</option>
                  <option value="WRONG_LOCATION">Wrong location repaired</option>
                  <option value="NEW_DAMAGE">New damage created during repair</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Citizen Observations / Explanation *
                </label>
                <textarea
                  rows={3}
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  placeholder="e.g., The crew only patched half the hole, the sharp edge is still exposed."
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Optional Photo Proof URL
                </label>
                <input
                  type="text"
                  value={rejectionProofUrl}
                  onChange={(e) => setRejectionProofUrl(e.target.value)}
                  placeholder="https://... or photo URL showing unresolved defect"
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectResolution}
                disabled={verifying}
                className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition-colors"
              >
                {verifying ? "Reopening..." : "Confirm Reopen Case"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUTHORITY WORKFLOW PANEL (Staff Only) */}
      {isStaff && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-indigo-200/60 pb-3">
            <div className="flex items-center space-x-2">
              <Building className="w-5 h-5 text-indigo-700" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Authority Operational Control Panel
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full">
              Logged in as {currentUser.role}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
            {/* 1. Team & Department Assignment */}
            <div className="space-y-3 bg-white p-4 rounded-xl border border-indigo-100">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-600" />
                Assign Field Team
              </h4>

              <div className="space-y-1">
                <label className="text-slate-500 text-[11px]">Department</label>
                <select
                  value={selectedDept}
                  onChange={(e) => {
                    setSelectedDept(e.target.value);
                    setSelectedTeam("");
                  }}
                  className="w-full rounded-lg border border-slate-200 p-2 bg-slate-50"
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {activeDept && (
                <div className="space-y-1">
                  <label className="text-slate-500 text-[11px]">
                    Operational Team (Recommended: lowest workload)
                  </label>
                  <select
                    value={selectedTeam}
                    onChange={(e) => setSelectedTeam(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2 bg-slate-50"
                  >
                    <option value="">Select Team</option>
                    {activeDept.teams.map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (Active cases: {t.activeWorkload})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={handleAssignTeam}
                disabled={actionLoading || !selectedTeam}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2 rounded-lg font-semibold transition-colors mt-2"
              >
                {actionLoading ? "Updating..." : "Authorize Dispatch"}
              </button>
            </div>

            {/* 2. Transition Status */}
            <div className="space-y-3 bg-white p-4 rounded-xl border border-indigo-100">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                <FileCheck2 className="w-4 h-4 text-indigo-600" />
                Change Workflow Status
              </h4>

              <div className="space-y-1">
                <label className="text-slate-500 text-[11px]">Target Status</label>
                <select
                  value={statusChangeTarget}
                  onChange={(e) => setStatusChangeTarget(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-2 bg-slate-50"
                >
                  <option value="">Select Status</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="VERIFIED">Verified (Moderation approved)</option>
                  <option value="INSPECTION_PENDING">Inspection Pending</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="REPAIR_COMPLETED">Repair Completed</option>
                  <option value="VERIFICATION_PENDING">Verification Pending (Citizen review)</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="REOPENED">Reopened</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 text-[11px]">Reason / Audit Note</label>
                <input
                  type="text"
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="e.g. Field repair finished, asphalt hardened."
                  className="w-full rounded-lg border border-slate-200 p-2"
                />
              </div>

              <button
                type="button"
                onClick={handleStatusChange}
                disabled={actionLoading || !statusChangeTarget}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white py-2 rounded-lg font-semibold transition-colors mt-2"
              >
                {actionLoading ? "Saving..." : "Update Status"}
              </button>
            </div>

            {/* 3. Upload Inspection / Repair Evidence */}
            <form onSubmit={handleUploadEvidence} className="space-y-3 bg-white p-4 rounded-xl border border-indigo-100">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-indigo-600" />
                Upload Field Proof
              </h4>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEvidenceTypeToUpload("INSPECTION")}
                  className={`flex-1 py-1.5 rounded-lg border font-semibold ${
                    evidenceTypeToUpload === "INSPECTION"
                      ? "bg-purple-100 text-purple-800 border-purple-300"
                      : "bg-slate-50 text-slate-600 border-slate-200"
                  }`}
                >
                  Inspection
                </button>
                <button
                  type="button"
                  onClick={() => setEvidenceTypeToUpload("REPAIR")}
                  className={`flex-1 py-1.5 rounded-lg border font-semibold ${
                    evidenceTypeToUpload === "REPAIR"
                      ? "bg-teal-100 text-teal-800 border-teal-300"
                      : "bg-slate-50 text-slate-600 border-slate-200"
                  }`}
                >
                  Repair Proof
                </button>
              </div>

              <input
                type="text"
                value={evidenceUploadUrl}
                onChange={(e) => setEvidenceUploadUrl(e.target.value)}
                placeholder="Image URL or upload path..."
                className="w-full rounded-lg border border-slate-200 p-2"
                required
              />

              <input
                type="text"
                value={evidenceNotes}
                onChange={(e) => setEvidenceNotes(e.target.value)}
                placeholder="Field notes (crew code, materials used)..."
                className="w-full rounded-lg border border-slate-200 p-2"
              />

              <button
                type="submit"
                disabled={actionLoading || !evidenceUploadUrl}
                className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white py-2 rounded-lg font-semibold transition-colors"
              >
                {actionLoading ? "Processing..." : "Submit Evidence & Run AI Comparison"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* BEFORE / AFTER EVIDENCE COMPARISON */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-900 tracking-tight">
          Visual Evidence Dossier
        </h2>
        <BeforeAfterEvidence
          evidenceList={incident.evidence || []}
          resolutionConfidence={incident.verifications?.[0]?.resolutionConfidence}
        />
      </div>

      {/* PRIORITY ENGINE BREAKDOWN & RECURRENCE ALERT */}
      {priorityBreakdown && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Deterministic Priority Scoring Breakdown
            </h3>
            <span className="text-xs font-mono font-bold text-blue-600">
              Total: {incident.priorityScore}/100 ({incident.priorityLabel})
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Severity</span>
              <span className="text-sm font-bold text-slate-800">+{priorityBreakdown.severityScore}</span>
              <span className="text-[10px] text-slate-500 block">max 30</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Safety Risk</span>
              <span className="text-sm font-bold text-slate-800">+{priorityBreakdown.safetyScore}</span>
              <span className="text-[10px] text-slate-500 block">max 25</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Multi-Report</span>
              <span className="text-sm font-bold text-slate-800">+{priorityBreakdown.multipleReportsScore}</span>
              <span className="text-[10px] text-slate-500 block">max 12</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Traffic Load</span>
              <span className="text-sm font-bold text-slate-800">+{priorityBreakdown.trafficScore}</span>
              <span className="text-[10px] text-slate-500 block">max 8</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Elapsed Time</span>
              <span className="text-sm font-bold text-slate-800">+{priorityBreakdown.durationScore}</span>
              <span className="text-[10px] text-slate-500 block">max 7</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Recurrence</span>
              <span className="text-sm font-bold text-slate-800">+{priorityBreakdown.recurrenceScore}</span>
              <span className="text-[10px] text-slate-500 block">max 5</span>
            </div>
          </div>

          {/* Chronic Cluster Hypothesis if linked */}
          {incident.recurringCluster && (
            <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 text-xs space-y-1">
              <div className="flex items-center space-x-1.5 text-orange-900 font-bold">
                <RotateCcw className="w-4 h-4 text-orange-600" />
                <span>RECURRING PROBLEM CLUSTER DETECTED</span>
              </div>
              <p className="text-orange-950 font-medium">
                Sector Cluster: {incident.recurringCluster.title} ({incident.recurringCluster.totalIncidents} correlated incidents)
              </p>
              <p className="text-orange-800">
                <strong>System Hypothesis:</strong> {incident.recurringCluster.rootCauseHypothesis} (Confidence: {Math.round(incident.recurringCluster.confidenceScore * 100)}%)
              </p>
            </div>
          )}
        </div>
      )}

      {/* CONSTITUENT CITIZEN REPORTS (PROVING REPORT VS INCIDENT) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Constituent Citizen Reports ({incident.reports?.length || 0})
            </h3>
            <p className="text-xs text-slate-500">
              Multiple individual observations correlated into this single operational incident.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {incident.reports?.map((rep: any, idx: number) => (
            <div key={rep.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-blue-600">
                  {rep.trackingCode}
                </span>
                <span className="text-[10px] text-slate-400">
                  {new Date(rep.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                </span>
              </div>
              <p className="font-semibold text-slate-900">{rep.title}</p>
              <p className="text-slate-600 line-clamp-2 leading-relaxed">{rep.description}</p>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px] text-slate-500">
                <span>Reporter: {rep.anonymity === "PUBLIC" ? (rep.citizen?.name || "Citizen") : rep.anonymity}</span>
                <span>Flag: {rep.moderationFlag}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* VISUAL TIMELINE & AUDIT LOG */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Lifecycle Timeline & Audit Events
          </h2>
          <IncidentTimeline
            history={incident.statusHistory || []}
            evidenceList={incident.evidence || []}
          />
        </div>

        {/* COMMENTS & DISCUSSION (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-blue-600" />
            Discussion & Field Notes
          </h2>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-4">
            {/* Comment list */}
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {incident.comments?.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  No comments or field notes posted yet.
                </p>
              ) : (
                incident.comments?.map((c: any) => (
                  <div
                    key={c.id}
                    className={`p-3 rounded-xl border text-xs space-y-1 ${
                      c.isInternal
                        ? "bg-amber-50/60 border-amber-200 text-amber-950"
                        : "bg-slate-50 border-slate-200 text-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">
                        {c.authorName} ({c.authorRole})
                      </span>
                      <time className="text-[10px] text-slate-400">
                        {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </time>
                    </div>
                    <p className="leading-relaxed">{c.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Post comment input */}
            <form onSubmit={handlePostComment} className="space-y-2 pt-2 border-t border-slate-100">
              <textarea
                rows={2}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add public inquiry or field response..."
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />

              <div className="flex items-center justify-between">
                {isStaff && (
                  <label className="flex items-center space-x-1.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInternalComment}
                      onChange={(e) => setIsInternalComment(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span>Internal Staff Only</span>
                  </label>
                )}

                <button
                  type="submit"
                  disabled={commentLoading || !commentText.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ml-auto"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{commentLoading ? "Posting..." : "Post Comment"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* RELATIONSHIP GRAPH */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-900 tracking-tight">
          Visual Relational Provenance Graph
        </h2>
        <IncidentGraph incidentId={incident.id} />
      </div>
    </div>
  );
}
