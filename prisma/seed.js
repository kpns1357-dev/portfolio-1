const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Starting CivicOS realistic database seed...");

  // Clear existing records in correct relation order
  await prisma.auditLog.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.incidentRelationship.deleteMany();
  await prisma.priorityScoreBreakdown.deleteMany();
  await prisma.aIAnalysis.deleteMany();
  await prisma.duplicateCandidate.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.statusHistory.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.escalation.deleteMany();
  await prisma.evidence.deleteMany();
  await prisma.report.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.recurringCluster.deleteMany();
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();
  await prisma.department.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  // 1. Create Departments (8 departments)
  const departmentsData = [
    { name: "Roads & Transportation", code: "ROADS", description: "Asphalt repairs, pothole remediation, road markings, and arterial maintenance." },
    { name: "Waste Management & Sanitation", code: "WASTE", description: "Municipal solid waste collection, illegal dump clearance, and container maintenance." },
    { name: "Water Supply & Sewage", code: "WATER", description: "Potable water pipeline integrity, leaks, valve maintenance, and main water mains." },
    { name: "Drainage & Flood Control", code: "DRAIN", description: "Stormwater catch basins, runoff canals, culverts, and urban flood mitigation." },
    { name: "Street Lighting & Electrical", code: "LIGHT", description: "Street luminaires, pole integrity, wiring safety, and traffic power feeds." },
    { name: "Traffic Management Bureau", code: "TRAFFIC", description: "Traffic signal automation, signage, pedestrian crosswalks, and speed calming." },
    { name: "Parks & Urban Forestry", code: "ENV", description: "Tree pruning, dangerous limb clearance, public park upkeep, and urban greening." },
    { name: "Public Infrastructure Works", code: "INFRA", description: "Pedestrian sidewalks, curbs, guardrails, footbridges, and public accessibility ramps." },
  ];

  const depts = {};
  for (const d of departmentsData) {
    depts[d.code] = await prisma.department.create({ data: d });
  }

  // 2. Create Teams (16 teams under departments)
  const teamsData = [
    { name: "Road Rapid Response Alpha", departmentId: depts.ROADS.id, leadName: "Marcus Vance", contactPhone: "555-0101", activeWorkload: 4 },
    { name: "Asphalt Heavy Patch Team 1", departmentId: depts.ROADS.id, leadName: "Elena Rostova", contactPhone: "555-0102", activeWorkload: 6 },
    { name: "Pothole Jetpatcher Unit B", departmentId: depts.ROADS.id, leadName: "David Kim", contactPhone: "555-0103", activeWorkload: 2 },
    { name: "Waste Logistics Central", departmentId: depts.WASTE.id, leadName: "Tariq Mansoor", contactPhone: "555-0104", activeWorkload: 5 },
    { name: "Biohazard & Dump Remediation", departmentId: depts.WASTE.id, leadName: "Chloe Bennett", contactPhone: "555-0105", activeWorkload: 3 },
    { name: "Water Main Emergency Crew", departmentId: depts.WATER.id, leadName: "Robert Garcia", contactPhone: "555-0106", activeWorkload: 4 },
    { name: "Hydraulic Valve & Meter Squad", departmentId: depts.WATER.id, leadName: "Amina Yusuf", contactPhone: "555-0107", activeWorkload: 2 },
    { name: "Storm Sewer Jetting Team 1", departmentId: depts.DRAIN.id, leadName: "Sean O'Connor", contactPhone: "555-0108", activeWorkload: 5 },
    { name: "Flood Basin Clearing Unit", departmentId: depts.DRAIN.id, leadName: "Priya Sharma", contactPhone: "555-0109", activeWorkload: 3 },
    { name: "High-Voltage Linemen Crew", departmentId: depts.LIGHT.id, leadName: "Victor Chen", contactPhone: "555-0110", activeWorkload: 4 },
    { name: "LED Maintenance Mobile Squad", departmentId: depts.LIGHT.id, leadName: "Arthur Miller", contactPhone: "555-0111", activeWorkload: 1 },
    { name: "Traffic Signals & Electronics", departmentId: depts.TRAFFIC.id, leadName: "Samira Khan", contactPhone: "555-0112", activeWorkload: 3 },
    { name: "Signage & Road Markings Crew", departmentId: depts.TRAFFIC.id, leadName: "Liam Evans", contactPhone: "555-0113", activeWorkload: 2 },
    { name: "Urban Forestry Arborist Unit", departmentId: depts.ENV.id, leadName: "Hannah Lindqvist", contactPhone: "555-0114", activeWorkload: 3 },
    { name: "Sidewalk & Curb Restoration Squad", departmentId: depts.INFRA.id, leadName: "Carlos Mendez", contactPhone: "555-0115", activeWorkload: 4 },
    { name: "Accessibility & Barrier Works", departmentId: depts.INFRA.id, leadName: "Grace Hopper-Lin", contactPhone: "555-0116", activeWorkload: 2 },
  ];

  const createdTeams = [];
  for (const t of teamsData) {
    createdTeams.push(await prisma.team.create({ data: t }));
  }

  // 3. Create Categories
  const categoriesData = [
    { name: "Roads", slug: "roads", description: "Potholes, road surface cracking, sunken asphalt", severityBase: 6.5, defaultDepartmentId: depts.ROADS.id, icon: "Route" },
    { name: "Waste", slug: "waste", description: "Overflowing dumpsters, illegal dumping, littering", severityBase: 5.0, defaultDepartmentId: depts.WASTE.id, icon: "Trash2" },
    { name: "Water", slug: "water", description: "Burst mains, pipeline leaks, low water pressure", severityBase: 7.0, defaultDepartmentId: depts.WATER.id, icon: "Droplets" },
    { name: "Drainage", slug: "drainage", description: "Blocked storm drains, street flooding, clogged culverts", severityBase: 7.2, defaultDepartmentId: depts.DRAIN.id, icon: "Waves" },
    { name: "Lighting", slug: "lighting", description: "Unlit streetlights, exposed wiring, dark corridors", severityBase: 5.8, defaultDepartmentId: depts.LIGHT.id, icon: "Lightbulb" },
    { name: "Traffic", slug: "traffic", description: "Broken traffic lights, missing signs, blind spots", severityBase: 8.0, defaultDepartmentId: depts.TRAFFIC.id, icon: "TrafficCone" },
    { name: "Environment", slug: "environment", description: "Fallen tree branches, overgrown weeds, park damage", severityBase: 5.5, defaultDepartmentId: depts.ENV.id, icon: "Trees" },
    { name: "Public Infrastructure", slug: "infrastructure", description: "Broken sidewalk, damaged curb, missing manhole covers", severityBase: 6.8, defaultDepartmentId: depts.INFRA.id, icon: "Construction" },
    { name: "Safety", slug: "safety", description: "Open utility trenches, structural hazards, dangerous debris", severityBase: 8.8, defaultDepartmentId: depts.ROADS.id, icon: "ShieldAlert" },
    { name: "Other", slug: "other", description: "General municipal observations and civic concerns", severityBase: 4.0, defaultDepartmentId: depts.INFRA.id, icon: "HelpCircle" },
  ];

  const cats = {};
  for (const c of categoriesData) {
    cats[c.name] = await prisma.category.create({ data: c });
  }

  // 4. Create 20 Users (Core roles + citizen pool)
  const usersData = [
    { email: "admin@civicos.org", name: "Eleanor Sterling", role: "SUPER_ADMIN", phone: "555-1000", reliabilityScore: 1.0 },
    { email: "moderator@civicos.org", name: "Julian Thorne", role: "MODERATOR", phone: "555-1001", reliabilityScore: 0.98 },
    { email: "authority@civicos.org", name: "Director Sarah Ross", role: "AUTHORITY", departmentId: depts.ROADS.id, teamId: createdTeams[0].id, phone: "555-1002", reliabilityScore: 0.99 },
    { email: "citizen@civicos.org", name: "Alex Rivera", role: "CITIZEN", phone: "555-1003", reliabilityScore: 0.95 },
    { email: "arun.patel@gmail.com", name: "Arun Patel", role: "CITIZEN", phone: "555-1004", reliabilityScore: 0.92 },
    { email: "fatima.zahra@outlook.com", name: "Fatima Zahra", role: "CITIZEN", phone: "555-1005", reliabilityScore: 0.88 },
    { email: "marcus.brooks@yahoo.com", name: "Marcus Brooks", role: "CITIZEN", phone: "555-1006", reliabilityScore: 0.97 },
    { email: "linda.wu@gmail.com", name: "Linda Wu", role: "CITIZEN", phone: "555-1007", reliabilityScore: 0.91 },
    { email: "devon.clarke@domain.com", name: "Devon Clarke", role: "CITIZEN", phone: "555-1008", reliabilityScore: 0.85 },
    { email: "nadia.petrov@civicmail.com", name: "Nadia Petrov", role: "CITIZEN", phone: "555-1009", reliabilityScore: 0.96 },
    { email: "kwame.mensah@citymail.com", name: "Kwame Mensah", role: "CITIZEN", phone: "555-1010", reliabilityScore: 0.89 },
    { email: "hannah.schmidt@berlin.de", name: "Hannah Schmidt", role: "CITIZEN", phone: "555-1011", reliabilityScore: 0.94 },
    { email: "diego.ramirez@fastmail.com", name: "Diego Ramirez", role: "CITIZEN", phone: "555-1012", reliabilityScore: 0.93 },
    { email: "inspector.davis@civicos.org", name: "Insp. Keith Davis", role: "AUTHORITY", departmentId: depts.WATER.id, teamId: createdTeams[5].id, phone: "555-1013", reliabilityScore: 0.99 },
    { email: "inspector.lewis@civicos.org", name: "Insp. Maya Lewis", role: "AUTHORITY", departmentId: depts.DRAIN.id, teamId: createdTeams[7].id, phone: "555-1014", reliabilityScore: 0.99 },
    { email: "inspector.takahashi@civicos.org", name: "Insp. Kenji Takahashi", role: "AUTHORITY", departmentId: depts.LIGHT.id, teamId: createdTeams[9].id, phone: "555-1015", reliabilityScore: 0.98 },
    { email: "moderator2@civicos.org", name: "Rachel Vance", role: "MODERATOR", phone: "555-1016", reliabilityScore: 0.97 },
    { email: "citizen.tariq@gmail.com", name: "Tariq Al-Mansoor", role: "CITIZEN", phone: "555-1017", reliabilityScore: 0.82 },
    { email: "olivia.martinez@gmail.com", name: "Olivia Martinez", role: "CITIZEN", phone: "555-1018", reliabilityScore: 0.95 },
    { email: "zoe.adams@outlook.com", name: "Zoe Adams", role: "CITIZEN", phone: "555-1019", reliabilityScore: 0.90 },
  ];

  const users = [];
  for (const u of usersData) {
    users.push(await prisma.user.create({ data: { ...u, passwordHash } }));
  }

  // 5. Create 10 Recurring Clusters across City Districts
  const clustersData = [
    { title: "Sector 4 Chronic Drainage & Pavement Saturation", areaName: "Sector 4 (Old Town)", primaryCategory: "Drainage", totalIncidents: 12, rootCauseHypothesis: "Sub-surface stormwater drainage inadequacy leading to cyclical pavement foundation saturation and recurring asphalt collapse.", confidenceScore: 0.84, centerLat: 40.7128, centerLng: -74.0060, radiusMeters: 450, status: "ACTIVE" },
    { title: "Industrial Corridor Night Illegal Dumping", areaName: "Industrial Zone East", primaryCategory: "Waste", totalIncidents: 9, rootCauseHypothesis: "Unmonitored commercial back-alleys with absent nocturnal lighting encouraging commercial waste disposal evasion.", confidenceScore: 0.89, centerLat: 40.7250, centerLng: -73.9850, radiusMeters: 550, status: "INVESTIGATING" },
    { title: "Riverside Parkway Hydraulic Line Ruptures", areaName: "Riverside North", primaryCategory: "Water", totalIncidents: 8, rootCauseHypothesis: "Aging 1960s cast-iron distribution conduits experiencing pressure transients during peak morning pumping cycles.", confidenceScore: 0.81, centerLat: 40.7380, centerLng: -74.0120, radiusMeters: 400, status: "ACTIVE" },
    { title: "University Boulevard Pothole Hotspot", areaName: "University District", primaryCategory: "Roads", totalIncidents: 11, rootCauseHypothesis: "Heavy articulated transit bus wheel loads over degraded sub-base road bedding without reinforced aggregate.", confidenceScore: 0.87, centerLat: 40.7290, centerLng: -73.9960, radiusMeters: 380, status: "ACTIVE" },
    { title: "Market Square Streetlight Circuit Tripping", areaName: "Central Market", primaryCategory: "Lighting", totalIncidents: 7, rootCauseHypothesis: "Moisture infiltration into subterranean branch junction boxes causing repeated ground-fault interrupter trips.", confidenceScore: 0.78, centerLat: 40.7180, centerLng: -74.0010, radiusMeters: 320, status: "MITIGATED" },
    { title: "Westside Crossing Pedestrian Hazard Cluster", areaName: "Westside Heights", primaryCategory: "Public Infrastructure", totalIncidents: 8, rootCauseHypothesis: "Tree root expansion uplifting precast concrete pavers across the primary high-school walking corridor.", confidenceScore: 0.85, centerLat: 40.7420, centerLng: -74.0080, radiusMeters: 420, status: "ACTIVE" },
    { title: "Grand Avenue Traffic Signal Timing Anomalies", areaName: "Downtown Financial", primaryCategory: "Traffic", totalIncidents: 6, rootCauseHypothesis: "Failing inductive loop vehicle sensors at 4th & Grand creating false left-turn phase lockouts.", confidenceScore: 0.82, centerLat: 40.7090, centerLng: -74.0090, radiusMeters: 280, status: "ACTIVE" },
    { title: "Harbor View Gully Erosion & Clogged Flumes", areaName: "Harbor District", primaryCategory: "Drainage", totalIncidents: 7, rootCauseHypothesis: "Tidal silt accumulation blocking storm flume outfalls during lunar high tide intervals.", confidenceScore: 0.76, centerLat: 40.7020, centerLng: -74.0150, radiusMeters: 500, status: "ACTIVE" },
    { title: "Greenwood Park Overgrown Canopy Obstructions", areaName: "Greenwood Suburb", primaryCategory: "Environment", totalIncidents: 6, rootCauseHypothesis: "Rapid summer growth of invasive sumac obstructing traffic sightlines and streetlight illumination.", confidenceScore: 0.80, centerLat: 40.7350, centerLng: -73.9780, radiusMeters: 450, status: "ACTIVE" },
    { title: "Civic Center Pedestrian Ramp Deterioration", areaName: "Civic Plaza", primaryCategory: "Public Infrastructure", totalIncidents: 5, rootCauseHypothesis: "Winter salt de-icing chemical spalling fracturing ADA curb ramps.", confidenceScore: 0.83, centerLat: 40.7150, centerLng: -74.0030, radiusMeters: 300, status: "INVESTIGATING" },
  ];

  const createdClusters = [];
  for (const cl of clustersData) {
    createdClusters.push(await prisma.recurringCluster.create({ data: cl }));
  }

  // Realistic stock evidence images for before and after (clean civic URLs)
  const sampleEvidence = {
    potholeBefore: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&q=80",
    potholeAfter: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=80",
    wasteBefore: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800&q=80",
    wasteAfter: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&q=80",
    waterBefore: "https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=800&q=80",
    waterAfter: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80",
    lightBefore: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=800&q=80",
    lightAfter: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&q=80",
    drainBefore: "https://images.unsplash.com/photo-1547683905-f686c993aae5?w=800&q=80",
    drainAfter: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&q=80",
  };

  // 6. Generate 52 Real Incidents across categories, priorities, statuses
  const incidentTemplates = [
    // CRITICAL / HIGH / SLA BREACHED / ACTIVE
    {
      caseId: "CF-2026-28491",
      title: "Major Deep Pothole Threatening School Buses",
      description: "Severe crater-like pothole located 15 meters prior to St. Jude Elementary School gate. Vehicles forced to brake abruptly into oncoming traffic.",
      category: "Roads",
      priorityScore: 92,
      priorityLabel: "CRITICAL",
      department: depts.ROADS,
      team: createdTeams[0],
      status: "ASSIGNED",
      lat: 40.7135,
      lng: -74.0055,
      address: "142 Elm St near St. Jude Elementary, Sector 4",
      areaName: "Sector 4 (Old Town)",
      clusterId: createdClusters[0].id,
      slaHoursLeft: -6, // SLA BREACHED
      reportsCount: 4,
      beforeImg: sampleEvidence.potholeBefore,
    },
    {
      caseId: "CF-2026-28472",
      title: "High-Pressure Water Main Rupture Flooding Intersection",
      description: "Subterranean 12-inch potable water main burst, spewing water 2 feet into the air and buckling roadway asphalt.",
      category: "Water",
      priorityScore: 96,
      priorityLabel: "CRITICAL",
      department: depts.WATER,
      team: createdTeams[5],
      status: "IN_PROGRESS",
      lat: 40.7385,
      lng: -74.0118,
      address: "Riverside Pkwy & 14th St, Riverside North",
      areaName: "Riverside North",
      clusterId: createdClusters[2].id,
      slaHoursLeft: 4, // SLA WARNING
      reportsCount: 5,
      beforeImg: sampleEvidence.waterBefore,
    },
    {
      caseId: "CF-2026-28433",
      title: "Blocked Storm Drainage Canal Causing Flash Ponding",
      description: "Heavy plastic and vegetative debris completely damming the collector culvert. Road surface submerged 8 inches deep.",
      category: "Drainage",
      priorityScore: 88,
      priorityLabel: "CRITICAL",
      department: depts.DRAIN,
      team: createdTeams[7],
      status: "INSPECTION_PENDING",
      lat: 40.7122,
      lng: -74.0068,
      address: "Canal St & Market Crossing, Sector 4",
      areaName: "Sector 4 (Old Town)",
      clusterId: createdClusters[0].id,
      slaHoursLeft: 10,
      reportsCount: 3,
      beforeImg: sampleEvidence.drainBefore,
    },
    {
      caseId: "CF-2026-28410",
      title: "Exposed High-Voltage Streetlight Cable After Vehicle Clip",
      description: "Streetlight base knocked askew with live copper cables touching metal casing near pedestrian sidewalk.",
      category: "Lighting",
      priorityScore: 94,
      priorityLabel: "CRITICAL",
      department: depts.LIGHT,
      team: createdTeams[9],
      status: "ASSIGNED",
      lat: 40.7182,
      lng: -74.0015,
      address: "Market Sq East & Pine St, Central Market",
      areaName: "Central Market",
      clusterId: createdClusters[4].id,
      slaHoursLeft: -14, // SLA BREACHED
      reportsCount: 3,
      beforeImg: sampleEvidence.lightBefore,
    },
    {
      caseId: "CF-2026-28389",
      title: "Traffic Signal Failure on 4th & Grand Arterial",
      description: "Both signals stuck on flashing amber, causing chaotic gridlock and near-miss collisions during peak commute.",
      category: "Traffic",
      priorityScore: 86,
      priorityLabel: "CRITICAL",
      department: depts.TRAFFIC,
      team: createdTeams[11],
      status: "IN_PROGRESS",
      lat: 40.7092,
      lng: -74.0088,
      address: "4th Ave & Grand St, Downtown Financial",
      areaName: "Downtown Financial",
      clusterId: createdClusters[6].id,
      slaHoursLeft: 8,
      reportsCount: 6,
      beforeImg: sampleEvidence.potholeBefore,
    },
    // VERIFICATION PENDING (Needs citizen review)
    {
      caseId: "CF-2026-28355",
      title: "Commercial Waste Fly-Tipping in Alleyway",
      description: "Piles of construction rubble and discarded commercial mattresses obstructing delivery vehicle passage.",
      category: "Waste",
      priorityScore: 68,
      priorityLabel: "HIGH",
      department: depts.WASTE,
      team: createdTeams[3],
      status: "VERIFICATION_PENDING",
      lat: 40.7252,
      lng: -73.9848,
      address: "Alley 4B, Industrial Zone East",
      areaName: "Industrial Zone East",
      clusterId: createdClusters[1].id,
      slaHoursLeft: 30,
      reportsCount: 2,
      beforeImg: sampleEvidence.wasteBefore,
      afterImg: sampleEvidence.wasteAfter,
    },
    {
      caseId: "CF-2026-28340",
      title: "Sunken Asphalt Trench on University Blvd",
      description: "Previous utility cut settled 4 inches, causing severe jarring vibrations to passing transit buses.",
      category: "Roads",
      priorityScore: 74,
      priorityLabel: "HIGH",
      department: depts.ROADS,
      team: createdTeams[1],
      status: "VERIFICATION_PENDING",
      lat: 40.7295,
      lng: -73.9958,
      address: "800 University Blvd, University District",
      areaName: "University District",
      clusterId: createdClusters[3].id,
      slaHoursLeft: 22,
      reportsCount: 4,
      beforeImg: sampleEvidence.potholeBefore,
      afterImg: sampleEvidence.potholeAfter,
    },
    // REOPENED CASES (Citizen rejected claimed resolution)
    {
      caseId: "CF-2026-28312",
      title: "Damaged Sidewalk Paver Trip Hazard",
      description: "Severe tree-root uplift of pedestrian concrete slabs directly outside Senior Care Facility.",
      category: "Public Infrastructure",
      priorityScore: 78,
      priorityLabel: "HIGH",
      department: depts.INFRA,
      team: createdTeams[14],
      status: "REOPENED",
      lat: 40.7425,
      lng: -74.0078,
      address: "320 Westside Heights Rd",
      areaName: "Westside Heights",
      clusterId: createdClusters[5].id,
      slaHoursLeft: 12,
      reportsCount: 3,
      beforeImg: sampleEvidence.potholeBefore,
      afterImg: sampleEvidence.potholeAfter,
      rejectedReason: "PARTIALLY_FIXED",
      rejectedNotes: "Workers only applied a thin cold patch over half the slabs. The main root ledge is still protruding 3 inches and someone tripped yesterday.",
    },
    // RESOLVED CASES (Successful full cycle)
    {
      caseId: "CF-2026-28290",
      title: "Collapsed Catch Basin Grate on Market Square",
      description: "Cast-iron grating fractured under heavy delivery truck wheel load. Hole cordoned off and newly fabricated ductile iron cover installed.",
      category: "Drainage",
      priorityScore: 82,
      priorityLabel: "HIGH",
      department: depts.DRAIN,
      team: createdTeams[8],
      status: "RESOLVED",
      lat: 40.7185,
      lng: -74.0005,
      address: "Market Square North Gate",
      areaName: "Central Market",
      clusterId: createdClusters[4].id,
      slaHoursLeft: 48,
      reportsCount: 3,
      resolvedDaysAgo: 2,
      beforeImg: sampleEvidence.drainBefore,
      afterImg: sampleEvidence.drainAfter,
    },
    {
      caseId: "CF-2026-28265",
      title: "Fallen Tree Branch Snapping Service Wire",
      description: "Large oak limb fell across sidewalk, tearing down low-voltage communication wire. Arborists chipped limb and cleared path.",
      category: "Environment",
      priorityScore: 71,
      priorityLabel: "HIGH",
      department: depts.ENV,
      team: createdTeams[13],
      status: "RESOLVED",
      lat: 40.7352,
      lng: -73.9785,
      address: "Greenwood Ave near Park Entrance",
      areaName: "Greenwood Suburb",
      clusterId: createdClusters[8].id,
      slaHoursLeft: 56,
      reportsCount: 2,
      resolvedDaysAgo: 5,
      beforeImg: sampleEvidence.potholeBefore,
      afterImg: sampleEvidence.potholeAfter,
    },
  ];

  // Fill up to 50 incidents across categories
  const categoriesList = ["Roads", "Waste", "Water", "Drainage", "Lighting", "Traffic", "Environment", "Public Infrastructure"];
  const areasList = [
    "Sector 4 (Old Town)", "Industrial Zone East", "Riverside North", "University District", 
    "Central Market", "Westside Heights", "Downtown Financial", "Harbor District", "Greenwood Suburb", "Civic Plaza"
  ];
  const statusesList = [
    "REPORTED", "UNDER_REVIEW", "VERIFIED", "ASSIGNED", "INSPECTION_PENDING", 
    "IN_PROGRESS", "REPAIR_COMPLETED", "VERIFICATION_PENDING", "RESOLVED", "RESOLVED"
  ];

  for (let i = 11; i <= 50; i++) {
    const caseId = `CF-2026-${28000 + i}`;
    const catName = categoriesList[i % categoriesList.length];
    const areaName = areasList[i % areasList.length];
    const status = statusesList[i % statusesList.length];
    const cat = cats[catName];
    const dept = cat.defaultDepartmentId ? Object.values(depts).find(d => d.id === cat.defaultDepartmentId) : depts.ROADS;
    const team = createdTeams.find(t => t.departmentId === dept.id) || createdTeams[0];
    
    // Vary priority: some low, medium, high, critical
    let priorityScore = 30 + ((i * 17) % 65);
    let priorityLabel = "MEDIUM";
    if (priorityScore >= 75) priorityLabel = "CRITICAL";
    else if (priorityScore >= 50) priorityLabel = "HIGH";
    else if (priorityScore < 25) priorityLabel = "LOW";

    // Randomize nearby coordinate offset around New York / Metro civic grid
    const latOffset = ((i * 7) % 50 - 25) * 0.002;
    const lngOffset = ((i * 11) % 50 - 25) * 0.002;
    const lat = 40.7128 + latOffset;
    const lng = -74.0060 + lngOffset;

    const cluster = createdClusters[i % createdClusters.length];
    const hoursLeft = (i % 5 === 0) ? -8 : 12 + (i % 60);

    incidentTemplates.push({
      caseId,
      title: `${catName} Issue in ${areaName} #${i}`,
      description: `Citizen-reported ${catName.toLowerCase()} maintenance defect requiring municipal intervention near ${areaName}. Observation recorded with geo-coordinates.`,
      category: catName,
      priorityScore,
      priorityLabel,
      department: dept,
      team,
      status,
      lat,
      lng,
      address: `${100 + i} Civic Corridor, ${areaName}`,
      areaName,
      clusterId: cluster.id,
      slaHoursLeft: hoursLeft,
      reportsCount: 1 + (i % 4),
      resolvedDaysAgo: status === "RESOLVED" ? 1 + (i % 10) : undefined,
      beforeImg: sampleEvidence.potholeBefore,
      afterImg: status === "RESOLVED" || status === "VERIFICATION_PENDING" ? sampleEvidence.potholeAfter : undefined,
    });
  }

  // Create Incidents & Associated Reports & Evidence
  let reportCounter = 1000;
  let totalCreatedReports = 0;

  for (const item of incidentTemplates) {
    const cat = cats[item.category] || cats["Roads"];
    const now = new Date();
    const createdAt = new Date(now.getTime() - (item.resolvedDaysAgo ? item.resolvedDaysAgo * 86400000 : (48 - item.slaHoursLeft) * 3600000));
    const slaDeadline = new Date(createdAt.getTime() + (item.priorityLabel === "CRITICAL" ? 24 : item.priorityLabel === "HIGH" ? 72 : 168) * 3600000);
    const resolvedAt = item.status === "RESOLVED" ? new Date(now.getTime() - (item.resolvedDaysAgo || 1) * 86400000) : null;
    const slaStatus = item.slaHoursLeft <= 0 ? "BREACHED" : (item.slaHoursLeft <= 12 ? "WARNING" : "NORMAL");

    const incident = await prisma.incident.create({
      data: {
        caseId: item.caseId,
        title: item.title,
        description: item.description,
        categoryId: cat.id,
        status: item.status,
        priorityScore: item.priorityScore,
        priorityLabel: item.priorityLabel,
        departmentId: item.department ? item.department.id : depts.ROADS.id,
        teamId: item.team ? item.team.id : createdTeams[0].id,
        latitude: item.lat,
        longitude: item.lng,
        address: item.address,
        areaName: item.areaName,
        slaDeadline,
        slaStatus,
        escalationLevel: slaStatus === "BREACHED" ? 1 : 0,
        recurringClusterId: item.clusterId || null,
        createdAt,
        updatedAt: resolvedAt || createdAt,
        resolvedAt,
      },
    });

    // 1. Priority Breakdown Record
    await prisma.priorityScoreBreakdown.create({
      data: {
        incidentId: incident.id,
        severityScore: Math.round(item.priorityScore * 0.35),
        safetyScore: Math.round(item.priorityScore * 0.28),
        multipleReportsScore: Math.min(12, item.reportsCount * 3),
        trafficScore: 7,
        durationScore: item.slaHoursLeft <= 0 ? 7 : 3,
        recurrenceScore: item.clusterId ? 5 : 0,
        totalScore: item.priorityScore,
        explanation: JSON.stringify({
          severity: `Severity factor: +${Math.round(item.priorityScore * 0.35)}`,
          safety: `Safety risk factor: +${Math.round(item.priorityScore * 0.28)}`,
          multipleReports: `Multiple citizen reports (${item.reportsCount}): +${Math.min(12, item.reportsCount * 3)}`,
          traffic: `Arterial transit load: +7`,
          duration: item.slaHoursLeft <= 0 ? `SLA threshold exceeded: +7` : `Elapsed cycle: +3`,
          recurrence: item.clusterId ? `Chronic sector cluster: +5` : `Isolated report: +0`,
        }),
      },
    });

    // 2. Status History (Timeline events)
    await prisma.statusHistory.create({
      data: {
        incidentId: incident.id,
        fromStatus: "NONE",
        toStatus: "REPORTED",
        actorId: users[3].id,
        actorName: users[3].name,
        actorRole: "CITIZEN",
        reason: "Initial citizen observation submitted via mobile app.",
        createdAt: createdAt,
      },
    });

    if (item.status !== "REPORTED") {
      await prisma.statusHistory.create({
        data: {
          incidentId: incident.id,
          fromStatus: "REPORTED",
          toStatus: "VERIFIED",
          actorId: users[1].id,
          actorName: users[1].name,
          actorRole: "MODERATOR",
          reason: "Moderator reviewed evidence and confirmed municipal validity.",
          createdAt: new Date(createdAt.getTime() + 15 * 60000),
        },
      });
    }

    if (["ASSIGNED", "INSPECTION_PENDING", "IN_PROGRESS", "REPAIR_COMPLETED", "VERIFICATION_PENDING", "RESOLVED", "REOPENED"].includes(item.status)) {
      await prisma.statusHistory.create({
        data: {
          incidentId: incident.id,
          fromStatus: "VERIFIED",
          toStatus: "ASSIGNED",
          actorId: users[2].id,
          actorName: users[2].name,
          actorRole: "AUTHORITY",
          reason: `Assigned to ${item.team ? item.team.name : "Field Team"}.`,
          createdAt: new Date(createdAt.getTime() + 45 * 60000),
        },
      });

      // Active Assignment Record
      await prisma.assignment.create({
        data: {
          incidentId: incident.id,
          teamId: item.team ? item.team.id : createdTeams[0].id,
          departmentId: item.department ? item.department.id : depts.ROADS.id,
          assignedById: users[2].id,
          notes: "Priority dispatch authorized. Check safety perimeter upon arrival.",
          active: item.status !== "RESOLVED",
          assignedAt: new Date(createdAt.getTime() + 45 * 60000),
        },
      });
    }

    // 3. Evidence
    if (item.beforeImg) {
      await prisma.evidence.create({
        data: {
          incidentId: incident.id,
          evidenceType: "CITIZEN_SUBMISSION",
          url: item.beforeImg,
          filename: `citizen_evidence_${incident.caseId}.jpg`,
          mimeType: "image/jpeg",
          sizeBytes: 1024 * 350,
          capturedAt: createdAt,
          notes: "Initial problem observation uploaded by citizen.",
          uploaderId: users[3].id,
        },
      });
    }

    if (item.afterImg) {
      await prisma.evidence.create({
        data: {
          incidentId: incident.id,
          evidenceType: "REPAIR",
          url: item.afterImg,
          filename: `repair_completed_${incident.caseId}.jpg`,
          mimeType: "image/jpeg",
          sizeBytes: 1024 * 420,
          capturedAt: resolvedAt || new Date(createdAt.getTime() + 4 * 3600000),
          notes: "Post-repair completion inspection evidence uploaded by field crew.",
          uploaderId: users[2].id,
        },
      });
    }

    // 4. Verification Record if applicable
    if (item.status === "VERIFICATION_PENDING" || item.status === "RESOLVED" || item.status === "REOPENED") {
      await prisma.verification.create({
        data: {
          incidentId: incident.id,
          citizenId: users[3].id,
          status: item.status === "RESOLVED" ? "CONFIRMED" : (item.status === "REOPENED" ? "REJECTED" : "PENDING"),
          rejectionReason: item.rejectedReason || null,
          citizenNotes: item.rejectedNotes || (item.status === "RESOLVED" ? "Looks great, road completely smooth again. Thank you!" : null),
          aiMatchScore: 0.89,
          visibleChangeDetected: true,
          resolutionConfidence: 0.86,
          createdAt: new Date(createdAt.getTime() + 5 * 3600000),
          respondedAt: item.status !== "VERIFICATION_PENDING" ? new Date(createdAt.getTime() + 6 * 3600000) : null,
        },
      });
    }

    // 5. Generate multiple constituent citizen REPORTS under this incident (to prove Report vs Incident architecture)
    for (let r = 0; r < item.reportsCount; r++) {
      reportCounter++;
      totalCreatedReports++;
      const citizenUser = users[(reportCounter + r) % users.length];
      const trackingCode = `REP-2026-${reportCounter}`;
      
      const report = await prisma.report.create({
        data: {
          trackingCode,
          title: r === 0 ? item.title : `${item.title} (Additional observation)`,
          description: r === 0 ? item.description : `Witnessed same defect while driving past. Needs quick fix.`,
          categoryId: cat.id,
          citizenId: citizenUser.id,
          anonymity: r % 3 === 0 ? "PUBLIC" : (r % 3 === 1 ? "HIDDEN" : "ANONYMOUS"),
          latitude: item.lat + (r * 0.0001),
          longitude: item.lng + (r * 0.0001),
          address: item.address,
          landmark: "Near intersection",
          incidentId: incident.id,
          moderationFlag: "CLEAN",
          createdAt: new Date(createdAt.getTime() + r * 1800000),
        },
      });

      // AI Analysis record for report
      await prisma.aIAnalysis.create({
        data: {
          reportId: report.id,
          detectedProblem: item.title,
          category: cat.name,
          severityScore: (item.priorityScore / 10),
          safetyRisk: item.priorityLabel,
          recommendedDepartment: item.department.name,
          summary: `${item.title} verified by AI diagnostic model. Recommended priority ${item.priorityLabel}.`,
          confidence: 0.92,
          isDemo: true,
        },
      });

      // Also link duplicate candidate if r > 0
      if (r > 0) {
        await prisma.duplicateCandidate.create({
          data: {
            reportId: report.id,
            potentialIncidentId: incident.id,
            similarityScore: 0.94,
            distanceMeters: Math.round(r * 12),
            status: "MERGED",
          },
        });
      }
    }

    // 6. Comments on incident
    await prisma.comment.create({
      data: {
        incidentId: incident.id,
        authorId: users[2].id,
        authorName: "Sarah Ross (Authority)",
        authorRole: "AUTHORITY",
        content: `Case accepted by ${item.department.name}. Work order dispatched.`,
        isInternal: false,
        createdAt: new Date(createdAt.getTime() + 50 * 60000),
      },
    });

    // 7. Escalation record if SLA breached
    if (slaStatus === "BREACHED") {
      await prisma.escalation.create({
        data: {
          incidentId: incident.id,
          level: 1,
          reason: "Standard SLA response window lapsed without verified field completion.",
          triggeredAt: slaDeadline,
          notes: "Automated alert forwarded to Department Director and Municipal Ops Center.",
        },
      });
    }
  }

  // 7. In-App Notifications for Demo Citizen & Authority
  await prisma.notification.createMany({
    data: [
      {
        userId: users[3].id, // citizen@civicos.org
        title: "Resolution Verification Required",
        message: "Authority has completed repairs for CF-2026-28355 (Commercial Waste Fly-Tipping). Please review and verify!",
        type: "VERIFICATION_REQUEST",
        link: "/incidents/CF-2026-28355",
        isRead: false,
      },
      {
        userId: users[3].id,
        title: "Report Status Updated: In Progress",
        message: "Your report CF-2026-28491 (Major Deep Pothole) has been assigned to Road Rapid Response Alpha.",
        type: "STATUS_CHANGE",
        link: "/incidents/CF-2026-28491",
        isRead: false,
      },
      {
        userId: users[3].id,
        title: "Duplicate Report Merged",
        message: "Your observation REP-2026-1002 was merged with existing active case CF-2026-28491.",
        type: "INFO",
        link: "/incidents/CF-2026-28491",
        isRead: true,
      },
      {
        userId: users[2].id, // authority@civicos.org
        title: "SLA Warning: Critical Incident Expiring",
        message: "CF-2026-28472 (High-Pressure Water Main Rupture) has 4 hours remaining before SLA breach.",
        type: "SLA_ALERT",
        link: "/incidents/CF-2026-28472",
        isRead: false,
      },
      {
        userId: users[2].id,
        title: "Incident Reopened by Citizen",
        message: "Citizen rejected resolution for CF-2026-28312: 'Workers only applied a thin cold patch over half the slabs.'",
        type: "STATUS_CHANGE",
        link: "/incidents/CF-2026-28312",
        isRead: false,
      },
    ],
  });

  // 8. Audit Log seed entries
  await prisma.auditLog.createMany({
    data: [
      {
        actorId: users[3].id,
        actorName: users[3].name,
        actorRole: "CITIZEN",
        action: "REPORT_CREATED",
        entityType: "Report",
        entityId: "REP-2026-1001",
        newState: JSON.stringify({ trackingCode: "REP-2026-1001", title: "Major Deep Pothole" }),
      },
      {
        actorId: users[1].id,
        actorName: users[1].name,
        actorRole: "MODERATOR",
        action: "INCIDENT_VERIFIED",
        entityType: "Incident",
        entityId: "CF-2026-28491",
        previousState: JSON.stringify({ status: "REPORTED" }),
        newState: JSON.stringify({ status: "VERIFIED" }),
      },
      {
        actorId: users[2].id,
        actorName: users[2].name,
        actorRole: "AUTHORITY",
        action: "TEAM_ASSIGNED",
        entityType: "Incident",
        entityId: "CF-2026-28491",
        newState: JSON.stringify({ teamName: "Road Rapid Response Alpha" }),
      },
      {
        actorId: users[3].id,
        actorName: users[3].name,
        actorRole: "CITIZEN",
        action: "RESOLUTION_REJECTED",
        entityType: "Incident",
        entityId: "CF-2026-28312",
        previousState: JSON.stringify({ status: "VERIFICATION_PENDING" }),
        newState: JSON.stringify({ status: "REOPENED", reason: "PARTIALLY_FIXED" }),
      },
    ],
  });

  console.log(`Seed complete! Successfully populated:`);
  console.log(`- ${incidentTemplates.length} Incidents`);
  console.log(`- ${totalCreatedReports} Citizen Reports`);
  console.log(`- ${createdClusters.length} Recurring Problem Clusters`);
  console.log(`- ${departmentsData.length} Departments`);
  console.log(`- ${createdTeams.length} Operational Teams`);
  console.log(`- ${users.length} Users with roles (Citizen, Moderator, Authority, Super Admin)`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
