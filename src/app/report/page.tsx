"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  Upload,
  MapPin,
  Sparkles,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Search,
  WifiOff,
  Crosshair,
  ExternalLink,
} from "lucide-react";
import { saveOfflineReport } from "@/lib/offline-sync";

interface EvidenceItem {
  id: string;
  dataUrl: string;
  filename: string;
}

export default function ReportWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [isOnline, setIsOnline] = useState(true);

  // Form State
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: 40.7128,
    lng: -74.0060,
  });
  const [address, setAddress] = useState("142 Elm St, Sector 4, Metro District");
  const [landmark, setLandmark] = useState("Opposite St. Jude Elementary Gate");
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const [description, setDescription] = useState("");
  const [title, setTitle] = useState("");
  const [anonymity, setAnonymity] = useState<"PUBLIC" | "HIDDEN" | "ANONYMOUS">("PUBLIC");

  // AI & Duplicates
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [possibleDuplicates, setPossibleDuplicates] = useState<any[]>([]);
  const [targetIncidentId, setTargetIncidentId] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<any | null>(null);

  useEffect(() => {
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Fetch categories
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (data.categories) {
          setCategories(data.categories);
        }
      })
      .catch(() => {});

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Evidence file handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) {
        alert("Please upload image files only (PNG, JPG, WEBP).");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert("File size exceeds 10MB limit.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setEvidenceList((prev) => [
            ...prev,
            {
              id: `img_${Date.now()}_${Math.random()}`,
              dataUrl: event.target!.result as string,
              filename: file.name,
            },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeEvidence = (id: string) => {
    setEvidenceList((prev) => prev.filter((item) => item.id !== id));
  };

  // Geolocation
  const requestGeolocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser. Please enter address manually.");
      return;
    }

    setLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        setAddress(`Lat: ${pos.coords.latitude.toFixed(4)}, Lng: ${pos.coords.longitude.toFixed(4)}, Metro District`);
      },
      (err) => {
        setLocating(false);
        setGeoError("Location permission denied or unavailable. Manual selection enabled.");
      },
      { timeout: 8000 }
    );
  };

  // Run AI Analysis & Duplicate Check
  const triggerAiAnalysis = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          images: evidenceList.map((e) => e.dataUrl),
          coordinates: { latitude: coords.lat, longitude: coords.lng },
          address,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiResult(data.analysis);
        setTitle(data.analysis.detectedProblem);
        setPossibleDuplicates(data.possibleDuplicates || []);

        // Pre-select category from AI
        const matched = categories.find(
          (c) => c.name.toLowerCase() === data.analysis.category.toLowerCase()
        );
        if (matched) {
          setSelectedCategory(matched.id);
        }
      }
    } catch (err) {
      console.error("AI Analysis error", err);
    } finally {
      setAnalyzing(false);
      setStep(4);
    }
  };

  // Submit Report
  const handleSubmitReport = async () => {
    setSubmitting(true);

    const reportPayload = {
      title: title || description.substring(0, 40),
      description,
      categoryId: selectedCategory || categories[0]?.id,
      latitude: coords.lat,
      longitude: coords.lng,
      address,
      landmark,
      anonymity,
      evidenceUrls: evidenceList.map((e) => e.dataUrl),
      targetIncidentId,
    };

    if (!isOnline) {
      // Store in IndexedDB for offline resilience
      try {
        const offlineReport = await saveOfflineReport({
          title: reportPayload.title,
          description: reportPayload.description,
          categoryId: reportPayload.categoryId,
          latitude: reportPayload.latitude,
          longitude: reportPayload.longitude,
          address: reportPayload.address,
          landmark: reportPayload.landmark,
          anonymity: reportPayload.anonymity,
          evidenceBase64: reportPayload.evidenceUrls,
        });

        setSubmitSuccess({
          isOffline: true,
          trackingCode: `OFFLINE-${offlineReport.localId.slice(-6)}`,
          incidentCaseId: "Assigned on reconnect",
          message: "Report securely stored on your device. It will automatically synchronize when network is restored.",
        });
      } catch (err) {
        alert("Failed to save offline report.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reportPayload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitSuccess({
          isOffline: false,
          trackingCode: data.report.trackingCode,
          incidentCaseId: data.report.incidentCaseId,
          aiAnalysis: data.report.aiAnalysis,
        });
      } else {
        alert(data.error || "Submission failed. Please check form.");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      {/* Wizard Header Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
              Citizen Reporting Portal
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Report a Civic Problem
            </h1>
          </div>
          <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md">
            Step {step} of 5
          </span>
        </div>

        {/* Step Indicator Bar */}
        <div className="grid grid-cols-5 gap-1.5">
          {[
            { s: 1, label: "Evidence" },
            { s: 2, label: "Location" },
            { s: 3, label: "Description" },
            { s: 4, label: "AI Analysis" },
            { s: 5, label: "Review" },
          ].map((item) => (
            <div key={item.s} className="space-y-1">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  step >= item.s ? "bg-blue-600" : "bg-slate-200"
                }`}
              />
              <span className="text-[10px] font-semibold text-slate-500 hidden sm:block">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* SUCCESS SCREEN */}
      {submitSuccess ? (
        <div className="rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-md animate-in fade-in zoom-in-95 duration-200">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {submitSuccess.isOffline ? "Report Saved to Device" : "Report Filed Successfully!"}
          </h2>

          <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto">
            {submitSuccess.isOffline
              ? submitSuccess.message
              : "Your observation has entered the municipal intelligence pipeline. You can follow live progress and verify the resolution when completed."}
          </p>

          <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 max-w-sm mx-auto text-left space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Observation Tracking ID:</span>
              <span className="font-mono font-bold text-slate-800">
                {submitSuccess.trackingCode}
              </span>
            </div>
            {!submitSuccess.isOffline && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Incident Case ID:</span>
                <span className="font-mono font-bold text-blue-600">
                  {submitSuccess.incidentCaseId}
                </span>
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {!submitSuccess.isOffline && (
              <button
                onClick={() => router.push(`/incidents/${submitSuccess.incidentCaseId}`)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                Track Case Progress <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => {
                setSubmitSuccess(null);
                setStep(1);
                setDescription("");
                setEvidenceList([]);
              }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-xs font-semibold transition-colors"
            >
              Report Another Problem
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
          {/* STEP 1: EVIDENCE */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Step 1: Upload Visual Evidence
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Clear photographs allow authorities to triage severity and assess equipment requirements.
                </p>
              </div>

              {/* Upload Dropzone */}
              <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-6 text-center transition-colors bg-slate-50/50">
                <input
                  type="file"
                  id="evidenceUpload"
                  multiple
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="evidenceUpload"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Camera className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">
                    Tap to take photo or choose files
                  </span>
                  <span className="text-[11px] text-slate-400">
                    JPG, PNG, WEBP up to 10MB. Multiple photos supported.
                  </span>
                </label>
              </div>

              {/* Previews */}
              {evidenceList.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700">
                    Attached Evidence ({evidenceList.length})
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {evidenceList.map((item) => (
                      <div
                        key={item.id}
                        className="relative rounded-xl overflow-hidden border border-slate-200 group aspect-video bg-slate-100"
                      >
                        <img
                          src={item.dataUrl}
                          alt="preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => removeEvidence(item.id)}
                          className="absolute top-1.5 right-1.5 bg-rose-600 text-white p-1 rounded-md shadow-xs opacity-90 hover:opacity-100"
                          title="Remove image"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  Continue to Location <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: LOCATION */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Step 2: Location & Address
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pinpoint where the problem is so the dispatch crew can navigate directly.
                </p>
              </div>

              {/* Geolocation Button */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={requestGeolocation}
                  disabled={locating}
                  className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors"
                >
                  <Crosshair className={`w-3.5 h-3.5 ${locating ? "animate-spin" : ""}`} />
                  {locating ? "Detecting GPS..." : "Use Current GPS Location"}
                </button>
              </div>

              {geoError && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{geoError}</span>
                </div>
              )}

              {/* Coordinates Preview */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Latitude
                  </span>
                  <span className="font-mono font-semibold text-slate-800">
                    {coords.lat.toFixed(6)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Longitude
                  </span>
                  <span className="font-mono font-semibold text-slate-800">
                    {coords.lng.toFixed(6)}
                  </span>
                </div>
              </div>

              {/* Address input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Street Address / Sector Location *
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g., 142 Elm St, Sector 4, Downtown"
                  className="w-full text-xs rounded-xl border border-slate-200 p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Landmark input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Nearby Landmark or Identifier (Optional)
                </label>
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="e.g., Outside Metro Station Gate 2, near pharmacy"
                  className="w-full text-xs rounded-xl border border-slate-200 p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="text-slate-600 hover:text-slate-900 text-xs font-semibold flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!address.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  Continue to Description <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: DESCRIPTION */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Step 3: Describe the Problem
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Describe naturally what you encountered. Municipal jargon is not required.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  What is happening? *
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., There is a large pothole near the school gate and vehicles are swerving dangerously to avoid it."
                  className="w-full text-xs rounded-xl border border-slate-200 p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                />
              </div>

              {/* Anonymity Selection */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 block">
                  Reporting Identity Setting
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: "PUBLIC", label: "Public Identity", desc: "Name visible on public case" },
                    { id: "HIDDEN", label: "Hidden from Public", desc: "Visible only to municipal staff" },
                    { id: "ANONYMOUS", label: "Completely Anonymous", desc: "No identity attached" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setAnonymity(opt.id as any)}
                      className={`text-left p-3 rounded-xl border text-xs transition-all ${
                        anonymity === opt.id
                          ? "border-blue-500 bg-blue-50/40 text-blue-900 ring-1 ring-blue-500"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <span className="font-bold block">{opt.label}</span>
                      <span className="text-[11px] text-slate-500">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="text-slate-600 hover:text-slate-900 text-xs font-semibold flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  onClick={triggerAiAnalysis}
                  disabled={!description.trim() || analyzing}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Sparkles className={`w-4 h-4 ${analyzing ? "animate-spin" : ""}`} />
                  <span>{analyzing ? "AI Analyzing..." : "Run AI Diagnostic"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: AI ANALYSIS & DUPLICATES */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-bold text-slate-900">
                    Step 4: AI Diagnostics & Duplicate Analysis
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  AI recommendation. Human review will verify before dispatch. You may adjust suggestions below.
                </p>
              </div>

              {/* AI Suggestion Card */}
              {aiResult && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-200/60 pb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                        Detected Problem
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">
                        {aiResult.detectedProblem}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-mono font-semibold">
                        Severity: {aiResult.severityScore}/10
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-md font-semibold ${
                          aiResult.safetyRisk === "CRITICAL"
                            ? "bg-rose-100 text-rose-800"
                            : aiResult.safetyRisk === "HIGH"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        Risk: {aiResult.safetyRisk}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-700 leading-relaxed">
                    <p>{aiResult.summary}</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      <strong>Recommended Department:</strong> {aiResult.recommendedDepartment} (Confidence: {Math.round(aiResult.confidence * 100)}%)
                    </p>
                  </div>
                </div>
              )}

              {/* Category Override Option */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Confirmed Problem Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 p-3 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Duplicate Candidates Alert */}
              {possibleDuplicates.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                      Possible Duplicate Reports Detected Nearby
                    </h4>
                  </div>
                  <p className="text-xs text-amber-800">
                    We found <strong>{possibleDuplicates.length} similar active cases</strong> nearby. You can link your observation to an existing case to boost its priority!
                  </p>

                  <div className="space-y-2">
                    {possibleDuplicates.map((dup) => (
                      <div
                        key={dup.incident.id}
                        className={`p-3 rounded-lg border text-xs transition-all flex items-center justify-between ${
                          targetIncidentId === dup.incident.id
                            ? "border-amber-500 bg-white shadow-xs ring-1 ring-amber-500"
                            : "border-amber-200 bg-amber-100/40 hover:bg-white"
                        }`}
                      >
                        <div>
                          <span className="font-mono font-bold text-blue-600">
                            {dup.incident.caseId}
                          </span>
                          <p className="font-semibold text-slate-900 mt-0.5">
                            {dup.incident.title}
                          </p>
                          <span className="text-[11px] text-slate-500">
                            {dup.distanceMeters}m away · {Math.round(dup.similarityScore * 100)}% match
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setTargetIncidentId(
                              targetIncidentId === dup.incident.id ? null : dup.incident.id
                            )
                          }
                          className={`px-3 py-1.5 rounded-md font-semibold text-xs transition-colors ${
                            targetIncidentId === dup.incident.id
                              ? "bg-amber-600 text-white"
                              : "bg-white border border-amber-300 text-amber-800 hover:bg-amber-50"
                          }`}
                        >
                          {targetIncidentId === dup.incident.id ? "Attached" : "Attach as Duplicate"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setStep(3)}
                  className="text-slate-600 hover:text-slate-900 text-xs font-semibold flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  onClick={() => setStep(5)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  Review & Submit <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: REVIEW & FINAL SUBMISSION */}
          {step === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Step 5: Review Incident Report
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Confirm all details before submitting to the municipal dispatch queue.
                </p>
              </div>

              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3 text-xs">
                <div className="pt-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Observation Title
                  </span>
                  <span className="font-semibold text-slate-900 text-sm">
                    {title || "Civic Problem"}
                  </span>
                </div>

                <div className="pt-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Description
                  </span>
                  <p className="text-slate-700 mt-0.5 leading-relaxed">{description}</p>
                </div>

                <div className="pt-2 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Location
                    </span>
                    <span className="text-slate-800 font-medium">{address}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Anonymity
                    </span>
                    <span className="text-slate-800 font-medium">{anonymity}</span>
                  </div>
                </div>

                {evidenceList.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Evidence Photos ({evidenceList.length})
                    </span>
                    <div className="flex gap-2">
                      {evidenceList.map((e) => (
                        <img
                          key={e.id}
                          src={e.dataUrl}
                          alt="evidence"
                          className="w-14 h-14 object-cover rounded-lg border border-slate-200"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {targetIncidentId && (
                  <div className="pt-2 text-amber-800">
                    <span className="text-[10px] uppercase font-bold block">
                      Merged Linking
                    </span>
                    <span>
                      Attaching to existing active incident target ({targetIncidentId}).
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setStep(4)}
                  className="text-slate-600 hover:text-slate-900 text-xs font-semibold flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  onClick={handleSubmitReport}
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>{submitting ? "Submitting to Municipal OS..." : "SUBMIT REPORT"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
