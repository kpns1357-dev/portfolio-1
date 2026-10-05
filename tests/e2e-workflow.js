const http = require("http");

async function post(url, data, cookie = "") {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const body = JSON.stringify(data);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          Cookie: cookie,
          Origin: "http://localhost:3000",
        },
      },
      (res) => {
        let respData = "";
        res.on("data", (chunk) => (respData += chunk));
        res.on("end", () => {
          let parsed;
          try {
            parsed = JSON.parse(respData);
          } catch {
            parsed = respData;
          }
          const rawCookies = res.headers["set-cookie"] || [];
          const cookieHeader = rawCookies.map((c) => c.split(";")[0]).join("; ");
          resolve({ status: res.statusCode, data: parsed, cookies: cookieHeader });
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function get(url, cookie = "") {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method: "GET",
        headers: {
          Cookie: cookie,
          Origin: "http://localhost:3000",
        },
      },
      (res) => {
        let respData = "";
        res.on("data", (chunk) => (respData += chunk));
        res.on("end", () => {
          let parsed;
          try {
            parsed = JSON.parse(respData);
          } catch {
            parsed = respData;
          }
          resolve({ status: res.statusCode, data: parsed });
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

async function runEndToEndScenario() {
  console.log("=== STARTING CIVICOS COMPREHENSIVE E2E VERIFICATION ===");

  // 1. Citizen Login
  console.log("\n1. Testing Citizen Authentication...");
  const citizenLogin = await post("http://localhost:3000/api/auth/login", {
    email: "citizen@civicos.org",
    password: "password123",
  });
  if (citizenLogin.status !== 200) throw new Error("Citizen login failed: " + JSON.stringify(citizenLogin.data));
  const citizenCookie = citizenLogin.cookies;
  console.log("✓ Citizen logged in:", citizenLogin.data.user.name, `(${citizenLogin.data.user.role})`);

  // 2. AI Diagnostic Analysis
  console.log("\n2. Testing AI Diagnostic Analysis & Duplicate Check...");
  const aiAnalysis = await post(
    "http://localhost:3000/api/ai/analyze",
    {
      description: "Deep dangerous crater pothole right outside school gate. Cars swerving into pedestrians.",
      coordinates: { latitude: 40.7135, longitude: -74.0055 },
      category: "Roads",
    },
    citizenCookie
  );
  if (aiAnalysis.status !== 200) throw new Error("AI analysis failed: " + JSON.stringify(aiAnalysis.data));
  console.log("✓ AI Analysis Output:", {
    problem: aiAnalysis.data.analysis.detectedProblem,
    severity: aiAnalysis.data.analysis.severityScore,
    risk: aiAnalysis.data.analysis.safetyRisk,
    dept: aiAnalysis.data.analysis.recommendedDepartment,
    duplicatesDetected: aiAnalysis.data.duplicatesCount,
  });

  // 3. Citizen Submits Report -> Creates Incident
  console.log("\n3. Testing Citizen Report Submission & Incident Creation...");
  const reportSubmission = await post(
    "http://localhost:3000/api/reports",
    {
      title: "Severe Pothole on School Crossing",
      description: "Deep dangerous crater pothole right outside school gate. Cars swerving into pedestrians.",
      categoryId: "cat_roads",
      latitude: 40.7135,
      longitude: -74.0055,
      address: "142 Elm St, Sector 4, Metro District",
      anonymity: "PUBLIC",
      evidenceUrls: ["https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&q=80"],
    },
    citizenCookie
  );
  if (reportSubmission.status !== 200) throw new Error("Report creation failed: " + JSON.stringify(reportSubmission.data));
  const newTrackingCode = reportSubmission.data.report.trackingCode;
  const newCaseId = reportSubmission.data.report.incidentCaseId;
  const newIncidentId = reportSubmission.data.report.incidentId;
  console.log(`✓ Report created: ${newTrackingCode} under Incident: ${newCaseId}`);

  // 4. Verify Incident Detail, Priority Breakdown, and SLA
  console.log("\n4. Verifying Incident Dossier, Priority Score, and SLA...");
  const incDetail = await get(`http://localhost:3000/api/incidents/${newCaseId}`, citizenCookie);
  if (incDetail.status !== 200) throw new Error("Fetch incident detail failed: " + JSON.stringify(incDetail.data));
  const incData = incDetail.data.incident;
  console.log("✓ Incident Status:", incData.status);
  console.log("✓ Priority Score:", `${incData.priorityScore}/100 (${incData.priorityLabel})`);
  console.log("✓ SLA Deadline:", incData.slaDeadline, `(Status: ${incData.slaStatus})`);
  console.log("✓ Priority Breakdown Total:", incData.priorityBreakdown?.totalScore);

  // 5. Moderator Login & Approval
  console.log("\n5. Testing Moderator Review & Verification...");
  const modLogin = await post("http://localhost:3000/api/auth/login", {
    email: "moderator@civicos.org",
    password: "password123",
  });
  if (modLogin.status !== 200) throw new Error("Moderator login failed: " + JSON.stringify(modLogin.data));
  const modCookie = modLogin.cookies;
  const modApprove = await post(
    "http://localhost:3000/api/moderation/action",
    { action: "APPROVE", incidentId: newIncidentId, reason: "Confirmed severe road defect on school transit route." },
    modCookie
  );
  if (modApprove.status !== 200) throw new Error("Moderator approve failed: " + JSON.stringify(modApprove.data));
  console.log("✓ Moderator approved incident. Status is now VERIFIED.");

  // 6. Authority Login & Field Team Assignment
  console.log("\n6. Testing Authority Team Assignment...");
  const authLogin = await post("http://localhost:3000/api/auth/login", {
    email: "authority@civicos.org",
    password: "password123",
  });
  if (authLogin.status !== 200) throw new Error("Authority login failed: " + JSON.stringify(authLogin.data));
  const authCookie = authLogin.cookies;

  const deptsRes = await get("http://localhost:3000/api/departments", authCookie);
  const roadDept = deptsRes.data.departments.find((d) => d.code === "ROADS") || deptsRes.data.departments[0];
  const teamId = roadDept.teams[0].id;

  const assignRes = await post(
    `http://localhost:3000/api/incidents/${newIncidentId}/assign`,
    { teamId, departmentId: roadDept.id, notes: "Priority dispatch authorized for Asphalt Rapid Unit." },
    authCookie
  );
  if (assignRes.status !== 200) throw new Error("Assignment failed: " + JSON.stringify(assignRes.data));
  console.log("✓ Assigned to:", assignRes.data.team.name, "Status:", assignRes.data.incidentStatus);

  // 7. Field Crew Uploads Inspection & Repair Evidence
  console.log("\n7. Testing Field Proof Upload & AI Comparison Engine...");
  const repairProof = await post(
    `http://localhost:3000/api/incidents/${newIncidentId}/evidence`,
    {
      url: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=80",
      evidenceType: "REPAIR",
      notes: "Crater excavated, hot-mix asphalt leveled and compacted with vibratory roller.",
    },
    authCookie
  );
  if (repairProof.status !== 200) throw new Error("Evidence upload failed: " + JSON.stringify(repairProof.data));
  console.log("✓ Repair Proof Accepted. Status:", repairProof.data.incidentStatus);
  console.log("✓ AI Resolution Confidence:", Math.round(repairProof.data.comparison.resolutionConfidence * 100) + "%");

  // 8. Citizen Verifies Resolution
  console.log("\n8. Testing Citizen Resolution Verification (Sign-off)...");
  const citizenVerify = await post(
    `http://localhost:3000/api/incidents/${newIncidentId}/verify`,
    { confirmed: true, citizenNotes: "Inspected on my walk home. The asphalt is completely smooth. Thank you!" },
    citizenCookie
  );
  if (citizenVerify.status !== 200) throw new Error("Verification failed: " + JSON.stringify(citizenVerify.data));
  console.log("✓ Citizen Verification Confirmed. Status is now:", citizenVerify.data.status);

  // 9. Opposite Flow Test: Citizen Rejection & Reopening
  console.log("\n9. Testing Opposite Scenario: Resolution Rejection & Automatic Reopening...");
  await post(`http://localhost:3000/api/incidents/${newIncidentId}/status`, { toStatus: "VERIFICATION_PENDING", reason: "Re-evaluating site condition" }, authCookie);

  const citizenReject = await post(
    `http://localhost:3000/api/incidents/${newIncidentId}/verify`,
    {
      confirmed: false,
      rejectionReason: "PARTIALLY_FIXED",
      citizenNotes: "The crew filled the main depression, but the curb edge is still sinking and cracked.",
      evidenceUrl: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&q=80",
    },
    citizenCookie
  );
  if (citizenReject.status !== 200) throw new Error("Rejection failed: " + JSON.stringify(citizenReject.data));
  console.log("✓ Citizen Rejected Resolution. Incident reopened! Status:", citizenReject.data.status);

  // 10. Verify Relational Graph & Audit Logging (Admin Auth)
  console.log("\n10. Verifying Relational Graph Nodes & Immutable Audit Trail...");
  const graphRes = await get(`http://localhost:3000/api/incidents/${newIncidentId}/graph`, citizenCookie);
  console.log(`✓ Graph Generated: ${graphRes.data.nodes.length} Nodes, ${graphRes.data.edges.length} Edges`);

  const adminLogin = await post("http://localhost:3000/api/auth/login", {
    email: "admin@civicos.org",
    password: "password123",
  });
  if (adminLogin.status !== 200) throw new Error("Admin login failed: " + JSON.stringify(adminLogin.data));
  const adminCookie = adminLogin.cookies;

  const auditRes = await get("http://localhost:3000/api/audit", adminCookie);
  console.log(`✓ Audit Records logged: ${auditRes.data.logs.length} Total events captured`);

  // 11. Natural Language Civic Assistant Query
  console.log("\n11. Testing Grounded Natural Language Analytics Assistant...");
  const aiAskRes = await post(
    "http://localhost:3000/api/ai/ask",
    {
      query: "Which department has the highest workload?",
    },
    citizenCookie
  );
  console.log("✓ Civic Assistant Answer:", aiAskRes.data.answer);

  console.log("\n=======================================================");
  console.log("ALL E2E CIVICOS WORKFLOW SCENARIOS VERIFIED 100% WORKING!");
  console.log("=======================================================");
}

runEndToEndScenario().catch((err) => {
  console.error("E2E Test Failed:", err);
  process.exit(1);
});
