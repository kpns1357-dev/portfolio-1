"use client";

import React, { useState, useEffect } from "react";
import {
  MapPin,
  FileText,
  Building,
  Users,
  Image,
  CheckCircle,
  Network,
  RotateCcw,
  Sparkles,
} from "lucide-react";

interface Node {
  id: string;
  label: string;
  sublabel?: string;
  type: string;
  color: string;
}

interface Edge {
  id: string;
  source: string;
  target: string;
  label: string;
}

interface IncidentGraphProps {
  incidentId: string;
}

export function IncidentGraph({ incidentId }: IncidentGraphProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  useEffect(() => {
    async function loadGraph() {
      try {
        const res = await fetch(`/api/incidents/${incidentId}/graph`);
        if (res.ok) {
          const data = await res.json();
          setNodes(data.nodes || []);
          setEdges(data.edges || []);
          if (data.nodes && data.nodes.length > 0) {
            setSelectedNode(data.nodes[1] || data.nodes[0]);
          }
        }
      } catch (err) {
        console.error("Failed to load graph data", err);
      } finally {
        setLoading(false);
      }
    }
    loadGraph();
  }, [incidentId]);

  if (loading) {
    return (
      <div className="h-64 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center">
        <span className="text-xs text-slate-400 font-medium animate-pulse">
          Constructing civic entity relationship graph...
        </span>
      </div>
    );
  }

  const getNodeIcon = (type: string) => {
    switch (type) {
      case "LOCATION":
        return <MapPin className="w-4 h-4 text-sky-600" />;
      case "INCIDENT":
        return <Network className="w-4 h-4 text-blue-600" />;
      case "REPORT":
        return <FileText className="w-4 h-4 text-emerald-600" />;
      case "DEPARTMENT":
        return <Building className="w-4 h-4 text-indigo-600" />;
      case "TEAM":
        return <Users className="w-4 h-4 text-purple-600" />;
      case "EVIDENCE":
        return <Image className="w-4 h-4 text-slate-600" />;
      case "VERIFICATION":
        return <CheckCircle className="w-4 h-4 text-amber-600" />;
      case "RECURRING_CLUSTER":
        return <RotateCcw className="w-4 h-4 text-orange-600" />;
      default:
        return <Sparkles className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Network className="w-4 h-4 text-blue-600" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Incident Relationship & Provenance Graph
          </h3>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">
          {nodes.length} entities · {edges.length} relations
        </span>
      </div>

      <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Interactive Node Explorer */}
        <div className="lg:col-span-2 space-y-3">
          <p className="text-[11px] text-slate-500">
            Click on any connected municipal entity to inspect relational provenance:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-96 overflow-y-auto pr-1">
            {nodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              return (
                <button
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className={`text-left p-3 rounded-lg border transition-all flex items-start space-x-3 ${
                    isSelected
                      ? "border-blue-500 bg-blue-50/50 shadow-xs ring-1 ring-blue-500"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div
                    className="p-2 rounded-md bg-white border border-slate-100 shadow-2xs shrink-0"
                    style={{ color: node.color }}
                  >
                    {getNodeIcon(node.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                      {node.type.replace("_", " ")}
                    </span>
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {node.label}
                    </p>
                    {node.sublabel && (
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {node.sublabel}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Entity Details Panel */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Selected Entity Inspector
            </span>
            {selectedNode ? (
              <div className="mt-3 space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-md bg-white border border-slate-200">
                    {getNodeIcon(selectedNode.type)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      {selectedNode.label}
                    </h4>
                    <span className="text-[11px] font-mono text-blue-600 font-medium">
                      {selectedNode.type}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-1.5 pt-2 border-t border-slate-200">
                  <p>
                    <strong>Description:</strong> {selectedNode.sublabel || "None recorded"}
                  </p>
                  <p>
                    <strong>Entity Key:</strong>{" "}
                    <code className="text-[11px] bg-white px-1 py-0.5 rounded border border-slate-200 font-mono">
                      {selectedNode.id}
                    </code>
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <span className="text-[11px] font-bold text-slate-700 block mb-1">
                    Connected Relations:
                  </span>
                  <div className="space-y-1">
                    {edges
                      .filter(
                        (e) =>
                          e.source === selectedNode.id || e.target === selectedNode.id
                      )
                      .map((edge) => (
                        <div
                          key={edge.id}
                          className="text-[11px] bg-white p-1.5 rounded border border-slate-200 flex items-center justify-between"
                        >
                          <span className="font-medium text-slate-700">
                            {edge.label}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {edge.source === selectedNode.id ? "Outgoing" : "Incoming"}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 mt-4">
                Select an entity node from the graph to inspect its properties.
              </p>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Verified Database Graph</span>
            <span>Relational Graph v1</span>
          </div>
        </div>
      </div>
    </div>
  );
}
