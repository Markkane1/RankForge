import {
  PrismaClient,
  StaffRole,
  ClientState,
  ClientType,
  TaskStatus,
  TaskPriority,
  ApprovalStatus,
  ReqStatus,
  LeadSource,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const NOW = new Date();
const DAYS_AGO = (n: number) => new Date(NOW.getTime() - n * 86400000);
const HOURS_AGO = (n: number) => new Date(NOW.getTime() - n * 3600000);

async function seed() {
  console.log("🌱 Seeding database...");

  // ─── Organization ───
  const org = await prisma.organization.upsert({
    where: { slug: "seo-delivery-agency" },
    update: {},
    create: {
      name: "SEO Delivery Agency",
      slug: "seo-delivery-agency",
      domain: "seodelivery.agency",
    },
  });

  // ─── Staff Users ───
  const passwordHash = await bcrypt.hash("password123", 10);
  const owner = await prisma.staffUser.upsert({
    where: { email: "owner@agency.com" },
    update: { passwordHash },
    create: {
      email: "owner@agency.com",
      name: "Hafiz Ali",
      role: StaffRole.OWNER,
      organizationId: org.id,
      lastLoginAt: HOURS_AGO(2),
      passwordHash,
    },
  });
  const coordinator = await prisma.staffUser.upsert({
    where: { email: "sarah@seodelivery.agency" },
    update: { passwordHash },
    create: {
      email: "sarah@seodelivery.agency",
      name: "Sarah Chen",
      role: StaffRole.COORDINATOR,
      organizationId: org.id,
      lastLoginAt: HOURS_AGO(4),
      passwordHash,
    },
  });
  const approver = await prisma.staffUser.upsert({
    where: { email: "omar@seodelivery.agency" },
    update: { passwordHash },
    create: {
      email: "omar@seodelivery.agency",
      name: "Omar Khan",
      role: StaffRole.APPROVER,
      organizationId: org.id,
      lastLoginAt: HOURS_AGO(1),
      passwordHash,
    },
  });
  const viewer = await prisma.staffUser.upsert({
    where: { email: "aisha@seodelivery.agency" },
    update: { passwordHash },
    create: {
      email: "aisha@seodelivery.agency",
      name: "Aisha Patel",
      role: StaffRole.VIEWER,
      organizationId: org.id,
      lastLoginAt: DAYS_AGO(1),
      passwordHash,
    },
  });

  // ─── Clients ───
  const clients: any[] = [];
  const clientData = [
    {
      name: "SparkleClean Pro",
      slug: "sparkleclean-pro",
      businessName: "SparkleClean Professional Cleaning Services",
      phone: "+1-555-0101",
      email: "info@sparkleclean.com",
      website: "https://sparkleclean.com",
      city: "Dallas",
      state: "TX",
      country: "US",
      type: ClientType.SERVICE_AREA_BUSINESS,
      lifecycleState: ClientState.GROWTH,
    },
    {
      name: "QuickFix Plumbing",
      slug: "quickfix-plumbing",
      businessName: "QuickFix Plumbing & Drain",
      phone: "+1-555-0102",
      email: "contact@quickfixplumbing.com",
      website: "https://quickfixplumbing.com",
      city: "Austin",
      state: "TX",
      country: "US",
      type: ClientType.STOREFRONT_BUSINESS,
      lifecycleState: ClientState.BUILD,
    },
    {
      name: "Bloom Garden Design",
      slug: "bloom-garden-design",
      businessName: "Bloom Garden Design & Landscaping",
      phone: "+1-555-0103",
      email: "hello@bloomgarden.com",
      website: "",
      city: "Miami",
      state: "FL",
      country: "US",
      type: ClientType.SERVICE_AREA_BUSINESS,
      lifecycleState: ClientState.ONBOARDING,
    },
    {
      name: "PeakFit Gym",
      slug: "peakfit-gym",
      businessName: "PeakFit Personal Training & Gym",
      phone: "+1-555-0104",
      email: "team@peakfit.com",
      website: "https://peakfit.com",
      city: "Denver",
      state: "CO",
      country: "US",
      type: ClientType.STOREFRONT_BUSINESS,
      lifecycleState: ClientState.GROWTH,
    },
    {
      name: "Coastal Bites Restaurant",
      slug: "coastal-bites",
      businessName: "Coastal Bites Seafood & Grill",
      phone: "+1-555-0105",
      email: "reservations@coastalbites.com",
      website: "https://coastalbites.com",
      city: "San Diego",
      state: "CA",
      country: "US",
      type: ClientType.STOREFRONT_BUSINESS,
      lifecycleState: ClientState.AT_RISK,
    },
    {
      name: "TechRepair Hub",
      slug: "techrepair-hub",
      businessName: "TechRepair Hub - Phone & Computer Repair",
      phone: "+1-555-0106",
      email: "fix@techrepairhub.com",
      website: "https://techrepairhub.com",
      city: "Seattle",
      state: "WA",
      country: "US",
      type: ClientType.SERVICE_AREA_BUSINESS,
      lifecycleState: ClientState.PAUSED,
    },
    {
      name: "Paws & Claws Vet",
      slug: "paws-claws-vet",
      businessName: "Paws & Claws Veterinary Clinic",
      phone: "+1-555-0107",
      email: "care@pawsclaws.vet",
      website: "https://pawsclaws.vet",
      city: "Portland",
      state: "OR",
      country: "US",
      type: ClientType.STOREFRONT_BUSINESS,
      lifecycleState: ClientState.BUILD,
    },
    {
      name: "Luxe Auto Detailing",
      slug: "luxe-auto",
      businessName: "Luxe Auto Detailing & Ceramic Coating",
      phone: "+1-555-0108",
      email: "book@luxeauto.com",
      website: "https://luxeauto.com",
      city: "Phoenix",
      state: "AZ",
      country: "US",
      type: ClientType.SERVICE_AREA_BUSINESS,
      lifecycleState: ClientState.GROWTH,
    },
  ];

  for (const cd of clientData) {
    const client = await prisma.client.upsert({
      where: { slug: cd.slug },
      update: { ...cd, organizationId: org.id },
      create: {
        ...cd,
        organizationId: org.id,
        address: "123 Main St",
        postalCode: "10001",
      },
    });
    clients.push(client);
  }

  // ─── GBP Profiles for active clients ───
  const gbpData = [
    {
      clientId: clients[0].id,
      primaryCategory: "Cleaning Service",
      secondaryCategories:
        '["House Cleaning","Commercial Cleaning","Move-In/Out Cleaning"]',
      description:
        "Professional cleaning services for homes and businesses. Trusted by 500+ customers in Dallas-Fort Worth area.",
      gbpLocationName: "SparkleClean Pro - Dallas",
      isVerified: true,
    },
    {
      clientId: clients[1].id,
      primaryCategory: "Plumber",
      secondaryCategories:
        '["Drain Cleaning","Water Heater Repair","Emergency Plumbing"]',
      description:
        "Licensed & insured plumbers available 24/7. Austin\'s most trusted plumbing service since 2015.",
      gbpLocationName: "QuickFix Plumbing - Austin",
      isVerified: true,
    },
    {
      clientId: clients[3].id,
      primaryCategory: "Gym",
      secondaryCategories:
        '["Personal Trainer","Fitness Center","Weight Training"]',
      description:
        "Denver\'s premier personal training gym. Custom programs, expert coaches, real results.",
      gbpLocationName: "PeakFit Gym - Denver",
      isVerified: true,
    },
    {
      clientId: clients[4].id,
      primaryCategory: "Seafood Restaurant",
      secondaryCategories: '["Restaurant","American Restaurant","Catering"]',
      description:
        "Fresh seafood sourced daily. Waterfront dining with the best ocean views in San Diego.",
      gbpLocationName: "Coastal Bites Seafood & Grill",
      isVerified: true,
      isSuspended: true,
    },
    {
      clientId: clients[6].id,
      primaryCategory: "Veterinarian",
      secondaryCategories:
        '["Animal Hospital","Pet Store","Emergency Veterinary Service"]',
      description:
        "Full-service veterinary care for dogs, cats, and exotic pets. Compassionate care you can trust.",
      gbpLocationName: "Paws & Claws Veterinary Clinic",
      isVerified: false,
    },
    {
      clientId: clients[7].id,
      primaryCategory: "Auto Detailing Service",
      secondaryCategories: '["Car Wash","Ceramic Coating","Window Tinting"]',
      description:
        "Premium auto detailing with ceramic coating protection. We make your car look brand new.",
      gbpLocationName: "Luxe Auto Detailing - Phoenix",
      isVerified: true,
    },
  ];

  for (const gbp of gbpData) {
    const existing = await prisma.gbpProfile.findFirst({ where: { clientId: gbp.clientId } });
    if (existing) {
      await prisma.gbpProfile.update({
        where: { id: existing.id },
        data: gbp,
      });
    } else {
      await prisma.gbpProfile.create({
        data: { ...gbp, lastSyncedAt: HOURS_AGO(3) },
      });
    }
  }

  // ─── GBP Reviews ───
  const reviewData = [
    {
      gbpProfileId: (await prisma.gbpProfile.findFirst({
        where: { clientId: clients[0].id },
      }))!.id,
      reviewerName: "Maria Garcia",
      rating: 5,
      content:
        "Amazing cleaning service! They made my house spotless in just 3 hours. Highly recommend.",
      reviewDate: DAYS_AGO(3),
      replyText: "Thank you Maria! We're thrilled you had a great experience.",
      repliedAt: DAYS_AGO(2),
    },
    {
      gbpProfileId: (await prisma.gbpProfile.findFirst({
        where: { clientId: clients[0].id },
      }))!.id,
      reviewerName: "John Smith",
      rating: 4,
      content: "Good service, slightly late but the quality was excellent.",
      reviewDate: DAYS_AGO(7),
    },
    {
      gbpProfileId: (await prisma.gbpProfile.findFirst({
        where: { clientId: clients[0].id },
      }))!.id,
      reviewerName: "Emily Chen",
      rating: 5,
      content:
        "Best cleaning company in Dallas! We use them monthly for our office.",
      reviewDate: DAYS_AGO(14),
      replyText: "Thank you for being a loyal customer, Emily!",
      repliedAt: DAYS_AGO(13),
    },
    {
      gbpProfileId: (await prisma.gbpProfile.findFirst({
        where: { clientId: clients[1].id },
      }))!.id,
      reviewerName: "Mike Johnson",
      rating: 2,
      content: "Took 4 hours to fix a simple leak. Overpriced.",
      reviewDate: DAYS_AGO(2),
    },
    {
      gbpProfileId: (await prisma.gbpProfile.findFirst({
        where: { clientId: clients[1].id },
      }))!.id,
      reviewerName: "Lisa Park",
      rating: 5,
      content:
        "Saved us from a flooded basement on a Saturday night. Lifesavers!",
      reviewDate: DAYS_AGO(10),
    },
    {
      gbpProfileId: (await prisma.gbpProfile.findFirst({
        where: { clientId: clients[3].id },
      }))!.id,
      reviewerName: "David Wilson",
      rating: 5,
      content:
        "Incredible transformation in 12 weeks. My coach Jake is the best!",
      reviewDate: DAYS_AGO(1),
    },
    {
      gbpProfileId: (await prisma.gbpProfile.findFirst({
        where: { clientId: clients[3].id },
      }))!.id,
      reviewerName: "Sarah Miller",
      rating: 4,
      content:
        "Great facility and friendly staff. Would love more group classes.",
      reviewDate: DAYS_AGO(5),
      replyText: "Thanks Sarah! We're adding 3 new group classes next month.",
      repliedAt: DAYS_AGO(4),
    },
    {
      gbpProfileId: (await prisma.gbpProfile.findFirst({
        where: { clientId: clients[4].id },
      }))!.id,
      reviewerName: "Angela Brown",
      rating: 1,
      content:
        "Waited 45 minutes for our table. Food was cold when it arrived. Never again.",
      reviewDate: DAYS_AGO(1),
    },
  ];

  for (const r of reviewData) {
    await prisma.gbpReview.create({ data: r });
  }

  // ─── Keywords ───
  const keywordData = [
    {
      clientId: clients[0].id,
      keyword: "cleaning service dallas",
      searchVolume: 2400,
      difficulty: 42,
      intent: "TRANSACTIONAL",
      mapPack: true,
      currentRank: 3,
      targetRank: 1,
      priority: 1,
    },
    {
      clientId: clients[0].id,
      keyword: "house cleaning near me",
      searchVolume: 8100,
      difficulty: 55,
      intent: "TRANSACTIONAL",
      mapPack: true,
      currentRank: 7,
      targetRank: 3,
      priority: 1,
    },
    {
      clientId: clients[0].id,
      keyword: "commercial cleaning dallas",
      searchVolume: 1200,
      difficulty: 38,
      intent: "COMMERCIAL",
      mapPack: true,
      currentRank: 2,
      targetRank: 1,
      priority: 2,
    },
    {
      clientId: clients[0].id,
      keyword: "move out cleaning dallas",
      searchVolume: 880,
      difficulty: 35,
      intent: "TRANSACTIONAL",
      mapPack: false,
      currentRank: 5,
      targetRank: 1,
      priority: 3,
    },
    {
      clientId: clients[0].id,
      keyword: "how to clean tile grout",
      searchVolume: 6600,
      difficulty: 25,
      intent: "INFORMATIONAL",
      mapPack: false,
      currentRank: 15,
      targetRank: 5,
      priority: 6,
    },
    {
      clientId: clients[1].id,
      keyword: "plumber austin tx",
      searchVolume: 3200,
      difficulty: 48,
      intent: "TRANSACTIONAL",
      mapPack: true,
      currentRank: 4,
      targetRank: 1,
      priority: 1,
    },
    {
      clientId: clients[1].id,
      keyword: "emergency plumbing near me",
      searchVolume: 5400,
      difficulty: 52,
      intent: "TRANSACTIONAL",
      mapPack: true,
      currentRank: 8,
      targetRank: 3,
      priority: 1,
    },
    {
      clientId: clients[1].id,
      keyword: "drain cleaning service",
      searchVolume: 2900,
      difficulty: 40,
      intent: "TRANSACTIONAL",
      mapPack: true,
      currentRank: 6,
      targetRank: 1,
      priority: 2,
    },
    {
      clientId: clients[3].id,
      keyword: "personal trainer denver",
      searchVolume: 1800,
      difficulty: 45,
      intent: "TRANSACTIONAL",
      mapPack: true,
      currentRank: 2,
      targetRank: 1,
      priority: 1,
    },
    {
      clientId: clients[3].id,
      keyword: "gym near me",
      searchVolume: 22000,
      difficulty: 68,
      intent: "NAVIGATIONAL",
      mapPack: true,
      currentRank: 12,
      targetRank: 3,
      priority: 2,
    },
    {
      clientId: clients[4].id,
      keyword: "seafood restaurant san diego",
      searchVolume: 4400,
      difficulty: 50,
      intent: "TRANSACTIONAL",
      mapPack: true,
      currentRank: 18,
      targetRank: 3,
      priority: 1,
    },
    {
      clientId: clients[7].id,
      keyword: "auto detailing phoenix",
      searchVolume: 1600,
      difficulty: 35,
      intent: "TRANSACTIONAL",
      mapPack: true,
      currentRank: 1,
      targetRank: 1,
      priority: 1,
      status: "ACHIEVED",
    },
    // Round 10: Keywords for clients 2 (GreenGrow), 5 (TechRepair), 6 (Paws & Claws)
    {
      clientId: clients[2].id,
      keyword: "lawn care service miami",
      searchVolume: 3200,
      difficulty: 44,
      intent: "TRANSACTIONAL",
      mapPack: true,
      currentRank: 6,
      targetRank: 1,
      priority: 1,
    },
    {
      clientId: clients[2].id,
      keyword: "landscaping near me",
      searchVolume: 9800,
      difficulty: 58,
      intent: "TRANSACTIONAL",
      mapPack: true,
      currentRank: 14,
      targetRank: 3,
      priority: 2,
    },
    {
      clientId: clients[2].id,
      keyword: "garden design miami",
      searchVolume: 880,
      difficulty: 32,
      intent: "TRANSACTIONAL",
      mapPack: false,
      currentRank: 3,
      targetRank: 1,
      priority: 1,
    },
    {
      clientId: clients[2].id,
      keyword: "tree trimming service",
      searchVolume: 4400,
      difficulty: 46,
      intent: "TRANSACTIONAL",
      mapPack: true,
      currentRank: 9,
      targetRank: 3,
      priority: 2,
    },
    {
      clientId: clients[5].id,
      keyword: "phone repair seattle",
      searchVolume: 5400,
      difficulty: 52,
      intent: "TRANSACTIONAL",
      mapPack: true,
      currentRank: 11,
      targetRank: 3,
      priority: 1,
    },
    {
      clientId: clients[5].id,
      keyword: "computer repair near me",
      searchVolume: 6600,
      difficulty: 48,
      intent: "TRANSACTIONAL",
      mapPack: true,
      currentRank: 7,
      targetRank: 1,
      priority: 1,
    },
    {
      clientId: clients[5].id,
      keyword: "laptop screen replacement",
      searchVolume: 2900,
      difficulty: 38,
      intent: "TRANSACTIONAL",
      mapPack: false,
      currentRank: 4,
      targetRank: 1,
      priority: 2,
    },
    {
      clientId: clients[6].id,
      keyword: "vet near me",
      searchVolume: 18000,
      difficulty: 62,
      intent: "NAVIGATIONAL",
      mapPack: true,
      currentRank: 5,
      targetRank: 1,
      priority: 1,
    },
    {
      clientId: clients[6].id,
      keyword: "animal hospital portland",
      searchVolume: 2400,
      difficulty: 42,
      intent: "TRANSACTIONAL",
      mapPack: true,
      currentRank: 8,
      targetRank: 1,
      priority: 1,
    },
    {
      clientId: clients[6].id,
      keyword: "pet vaccination clinic",
      searchVolume: 3200,
      difficulty: 35,
      intent: "TRANSACTIONAL",
      mapPack: true,
      currentRank: 2,
      targetRank: 1,
      priority: 1,
    },
    {
      clientId: clients[6].id,
      keyword: "emergency vet portland",
      searchVolume: 4800,
      difficulty: 50,
      intent: "TRANSACTIONAL",
      mapPack: true,
      currentRank: 13,
      targetRank: 3,
      priority: 2,
    },
    // More keywords for clients with only 1-2
    {
      clientId: clients[3].id,
      keyword: "strength training denver",
      searchVolume: 1200,
      difficulty: 38,
      intent: "TRANSACTIONAL",
      mapPack: false,
      currentRank: 5,
      targetRank: 1,
      priority: 3,
    },
    {
      clientId: clients[3].id,
      keyword: "personal training packages",
      searchVolume: 880,
      difficulty: 30,
      intent: "TRANSACTIONAL",
      mapPack: false,
      currentRank: 1,
      targetRank: 1,
      priority: 1,
      status: "ACHIEVED",
    },
    {
      clientId: clients[4].id,
      keyword: "best seafood san diego",
      searchVolume: 2200,
      difficulty: 45,
      intent: "INFORMATIONAL",
      mapPack: true,
      currentRank: 22,
      targetRank: 5,
      priority: 2,
    },
    {
      clientId: clients[4].id,
      keyword: "restaurant near me san diego",
      searchVolume: 12000,
      difficulty: 65,
      intent: "NAVIGATIONAL",
      mapPack: true,
      currentRank: 25,
      targetRank: 5,
      priority: 3,
    },
    {
      clientId: clients[7].id,
      keyword: "car detailing near me",
      searchVolume: 4400,
      difficulty: 48,
      intent: "TRANSACTIONAL",
      mapPack: true,
      currentRank: 4,
      targetRank: 1,
      priority: 1,
    },
    {
      clientId: clients[7].id,
      keyword: "ceramic coating phoenix",
      searchVolume: 1800,
      difficulty: 32,
      intent: "TRANSACTIONAL",
      mapPack: false,
      currentRank: 2,
      targetRank: 1,
      priority: 1,
    },
    {
      clientId: clients[0].id,
      keyword: "deep cleaning service",
      searchVolume: 5400,
      difficulty: 50,
      intent: "TRANSACTIONAL",
      mapPack: true,
      currentRank: 9,
      targetRank: 3,
      priority: 2,
    },
    {
      clientId: clients[1].id,
      keyword: "water heater repair austin",
      searchVolume: 1800,
      difficulty: 42,
      intent: "TRANSACTIONAL",
      mapPack: true,
      currentRank: 5,
      targetRank: 1,
      priority: 2,
    },
  ];

  for (const kw of keywordData) {
    await prisma.keywordMapEntry.create({ data: kw as any });
  }

  // ─── Service Areas ───
  const areaData = [
    {
      clientId: clients[0].id,
      name: "Dallas",
      city: "Dallas",
      radiusMiles: 25,
      isPrimary: true,
    },
    {
      clientId: clients[0].id,
      name: "Fort Worth",
      city: "Fort Worth",
      radiusMiles: 15,
    },
    { clientId: clients[0].id, name: "Plano", city: "Plano", radiusMiles: 10 },
    {
      clientId: clients[1].id,
      name: "Austin - Central",
      city: "Austin",
      radiusMiles: 20,
      isPrimary: true,
    },
    {
      clientId: clients[1].id,
      name: "Round Rock",
      city: "Round Rock",
      radiusMiles: 10,
    },
    {
      clientId: clients[3].id,
      name: "Denver Metro",
      city: "Denver",
      radiusMiles: 15,
      isPrimary: true,
    },
    {
      clientId: clients[4].id,
      name: "San Diego Coastal",
      city: "San Diego",
      radiusMiles: 10,
      isPrimary: true,
    },
  ];

  for (const a of areaData) {
    await prisma.serviceArea.create({ data: a });
  }

  // ─── Competitors ───
  const compData = [
    {
      clientId: clients[0].id,
      competitorName: "Merry Maids",
      competitorUrl: "https://merrymaids.com",
      avgRating: 4.3,
      reviewCount: 342,
      photoCount: 12,
      postFrequency: "Weekly",
      strengths:
        '{"brand_recognition": "Strong national brand", "review_volume": "High review count"}',
      weaknesses:
        '{"personalization": "Generic service descriptions", "response_time": "Slow review replies"}',
    },
    {
      clientId: clients[0].id,
      competitorName: "MaidPro Dallas",
      competitorUrl: "https://maidpro.com/locations/dallas",
      avgRating: 4.6,
      reviewCount: 189,
      photoCount: 24,
      postFrequency: "Bi-weekly",
      strengths:
        '{"photos": "High quality photos", "posts": "Consistent posting"}',
      weaknesses:
        '{"categories": "Only 2 categories", "service_list": "Limited services listed"}',
    },
    {
      clientId: clients[1].id,
      competitorName: "Benjamin Franklin Plumbing",
      competitorUrl: "https://benfranklinplumbing.com",
      avgRating: 4.1,
      reviewCount: 521,
      photoCount: 8,
      postFrequency: "Monthly",
      strengths:
        '{"reviews": "Very high review count", "brand": "National brand recognition"}',
      weaknesses:
        '{"rating": "Below 4.5 average", "engagement": "Low review reply rate"}',
    },
  ];

  for (const c of compData) {
    await prisma.competitorBenchmark.create({ data: c });
  }

  // ─── Tasks ───
  const taskData = [
    {
      taskId: "M1-1.1",
      clientId: clients[0].id,
      title: "Complete service taxonomy setup",
      description:
        "Build comprehensive parent/child service taxonomy for SparkleClean GBP profile",
      module: "M1",
      sprint: 3,
      priority: TaskPriority.HIGH,
      status: TaskStatus.DONE,
      assignedToId: coordinator.id,
      requestedById: owner.id,
      scheduledFor: DAYS_AGO(30),
      startedAt: DAYS_AGO(29),
      completedAt: DAYS_AGO(25),
    },
    {
      taskId: "M1-2.1",
      clientId: clients[0].id,
      title: "Keyword research via DataForSEO",
      description:
        "Pull keyword volume/difficulty data for primary and secondary keywords using DataForSEO API",
      module: "M1",
      sprint: 3,
      priority: TaskPriority.HIGH,
      status: TaskStatus.DONE,
      assignedToId: coordinator.id,
      requestedById: owner.id,
      scheduledFor: DAYS_AGO(28),
      startedAt: DAYS_AGO(27),
      completedAt: DAYS_AGO(23),
    },
    {
      taskId: "M1-3.1",
      clientId: clients[0].id,
      title: "Competitor analysis for Dallas market",
      description:
        "Run competitor teardown across 3+ geo-points and 5+ keywords using DataForSEO",
      module: "M1",
      sprint: 3,
      priority: TaskPriority.HIGH,
      status: TaskStatus.DONE,
      assignedToId: coordinator.id,
      requestedById: owner.id,
      completedAt: DAYS_AGO(20),
    },
    {
      taskId: "M1-4.1",
      clientId: clients[0].id,
      title: "Service area configuration",
      description:
        "Configure 3 service areas with correct radius for SAB profile",
      module: "M1",
      sprint: 3,
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.DONE,
      completedAt: DAYS_AGO(18),
    },
    {
      taskId: "M1-5.1",
      clientId: clients[0].id,
      title: "GBP description optimization",
      description:
        "Write 750-char description with banned-content linter compliance check",
      module: "M1",
      sprint: 3,
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.IN_PROGRESS,
      assignedToId: coordinator.id,
      requestedById: owner.id,
      startedAt: DAYS_AGO(2),
    },
    {
      taskId: "M1-6.1",
      clientId: clients[0].id,
      title: "Photo upload & benchmark check",
      description:
        "Upload exterior/interior photos and verify count meets competitor avg × 1.25",
      module: "M1",
      sprint: 3,
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.NOT_STARTED,
      assignedToId: coordinator.id,
      requestedById: owner.id,
      scheduledFor: DAYS_AGO(-2),
    },
    {
      taskId: "M6-STATE-01",
      clientId: clients[0].id,
      title: "Transition client to GROWTH state",
      description:
        "Execute state machine transition from BUILD to GROWTH after all Phase 0-2 tasks complete",
      module: "M6",
      sprint: 1,
      priority: TaskPriority.HIGH,
      status: TaskStatus.DONE,
      completedAt: DAYS_AGO(15),
    },
    {
      taskId: "M1-1.1",
      clientId: clients[1].id,
      title: "Complete service taxonomy setup",
      description: "Build service taxonomy for QuickFix Plumbing GBP profile",
      module: "M1",
      sprint: 3,
      priority: TaskPriority.HIGH,
      status: TaskStatus.IN_PROGRESS,
      assignedToId: coordinator.id,
      requestedById: owner.id,
      startedAt: DAYS_AGO(5),
    },
    {
      taskId: "M1-2.1",
      clientId: clients[1].id,
      title: "Keyword research via DataForSEO",
      description: "Pull keyword data for plumbing-related terms in Austin",
      module: "M1",
      sprint: 3,
      priority: TaskPriority.HIGH,
      status: TaskStatus.PENDING_APPROVAL,
      assignedToId: coordinator.id,
      requestedById: coordinator.id,
      startedAt: DAYS_AGO(3),
    },
    {
      taskId: "M1-1.1",
      clientId: clients[2].id,
      title: "Client onboarding questionnaire",
      description:
        "Complete intake questionnaire and create Client + GbpProfile draft",
      module: "M1",
      sprint: 2,
      priority: TaskPriority.CRITICAL,
      status: TaskStatus.NOT_STARTED,
      assignedToId: coordinator.id,
      requestedById: owner.id,
      scheduledFor: DAYS_AGO(-1),
    },
    {
      taskId: "M1-7.1",
      clientId: clients[0].id,
      title: "Monthly post calendar generation",
      description: "Generate 4-week post rotation calendar for SparkleClean",
      module: "M1",
      sprint: 4,
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.NOT_STARTED,
      scheduledFor: DAYS_AGO(-5),
    },
    {
      taskId: "M5-1.1",
      clientId: clients[0].id,
      title: "Baseline KPI snapshot capture",
      description:
        "Capture immutable baseline snapshot of all KPIs for SparkleClean",
      module: "M5",
      sprint: 5,
      priority: TaskPriority.HIGH,
      status: TaskStatus.NOT_STARTED,
      scheduledFor: DAYS_AGO(-7),
    },
    {
      taskId: "M6-TASK-01",
      clientId: null,
      title: "Weekly task scheduler heartbeat",
      description:
        "System task: process weekly recurring tasks and generate status summary",
      module: "M6",
      sprint: 1,
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.DONE,
      assignedToId: owner.id,
      completedAt: DAYS_AGO(1),
    },
    {
      taskId: "M3-1.1",
      clientId: clients[0].id,
      title: "Citation audit via BrightLocal",
      description:
        "Run full citation audit and classify findings by tier. BLOCKED: BrightLocal Grow subscription required.",
      module: "M3",
      sprint: 7,
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.BLOCKED,
      assignedToId: coordinator.id,
      requestedById: owner.id,
    },
    {
      taskId: "M1-5.1",
      clientId: clients[3].id,
      title: "GBP description optimization",
      description: "Write and optimize description for PeakFit Gym",
      module: "M1",
      sprint: 3,
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.FAILED,
      errorMessage: "DataForSEO API rate limit exceeded. Retry scheduled.",
      assignedToId: coordinator.id,
      requestedById: owner.id,
      retryCount: 2,
    },
    {
      taskId: "M4-1.1",
      clientId: clients[0].id,
      title: "Content calendar auto-population",
      description: "Auto-populate content calendar from informational keywords",
      module: "M4",
      sprint: 9,
      priority: TaskPriority.LOW,
      status: TaskStatus.DEFERRED,
      assignedToId: coordinator.id,
      requestedById: owner.id,
    },

    // ─── Luxe Auto Detailing (GROWTH, clients[7]) ───
    {
      taskId: "M1-POST-01",
      clientId: clients[7].id,
      title: "Monthly GBP post creation",
      description:
        "Create 4 weekly GBP posts for Luxe Auto Detailing covering before/after showcases, seasonal tips, and ceramic coating education",
      module: "M1",
      sprint: 4,
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.IN_PROGRESS,
      assignedToId: coordinator.id,
      requestedById: owner.id,
      startedAt: DAYS_AGO(2),
    },
    {
      taskId: "M1-REVIEW-01",
      clientId: clients[7].id,
      title: "Review response strategy",
      description:
        "Develop personalized review response templates for Luxe Auto Detailing and respond to 5 most recent reviews",
      module: "M1",
      sprint: 4,
      priority: TaskPriority.HIGH,
      status: TaskStatus.NOT_STARTED,
      assignedToId: coordinator.id,
      requestedById: owner.id,
      scheduledFor: DAYS_AGO(-1),
    },
    {
      taskId: "M3-CLEANUP-01",
      clientId: clients[7].id,
      title: "Citation cleanup for NAP consistency",
      description:
        "Audit and fix Name, Address, Phone inconsistencies across 50+ directories for Luxe Auto Detailing in Phoenix metro",
      module: "M3",
      sprint: 7,
      priority: TaskPriority.HIGH,
      status: TaskStatus.NOT_STARTED,
      assignedToId: coordinator.id,
      requestedById: approver.id,
      scheduledFor: DAYS_AGO(-3),
    },

    // ─── Paws & Claws Vet (BUILD, clients[6]) ───
    {
      taskId: "M1-CAT-01",
      clientId: clients[6].id,
      title: "GBP category optimization",
      description:
        "Review and optimize primary/secondary categories for Paws & Claws Vet — ensure 'Veterinarian' is primary, add 'Emergency Veterinary Service'",
      module: "M1",
      sprint: 3,
      priority: TaskPriority.HIGH,
      status: TaskStatus.NOT_STARTED,
      assignedToId: coordinator.id,
      requestedById: owner.id,
      scheduledFor: DAYS_AGO(-2),
    },
    {
      taskId: "M2-AUDIT-01",
      clientId: clients[6].id,
      title: "Website contact page audit",
      description:
        "Audit Paws & Claws website contact page for NAP consistency, schema markup, and CTA alignment with GBP profile",
      module: "M2",
      sprint: 5,
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.NOT_STARTED,
      assignedToId: coordinator.id,
      requestedById: owner.id,
      scheduledFor: DAYS_AGO(-4),
    },
    {
      taskId: "M1-QA-01",
      clientId: clients[6].id,
      title: "Google Q&A monitoring setup",
      description:
        "Set up Q&A monitoring for Paws & Claws Vet GBP profile, draft responses for 3 common veterinary questions",
      module: "M1",
      sprint: 4,
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.NOT_STARTED,
      assignedToId: viewer.id,
      requestedById: coordinator.id,
      scheduledFor: DAYS_AGO(-5),
    },

    // ─── TechRepair Hub (PAUSED, clients[5]) ───
    {
      taskId: "M6-REENGAGE-01",
      clientId: clients[5].id,
      title: "Re-engagement assessment",
      description:
        "Contact TechRepair Hub owner to assess re-engagement readiness, review reasons for pause, and prepare reactivation plan",
      module: "M6",
      sprint: 1,
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.NOT_STARTED,
      assignedToId: approver.id,
      requestedById: owner.id,
      scheduledFor: DAYS_AGO(-3),
    },
    {
      taskId: "M1-APPEAL-01",
      clientId: clients[5].id,
      title: "GBP suspension appeal",
      description:
        "Draft and submit GBP suspension appeal for TechRepair Hub with supporting business documentation",
      module: "M1",
      sprint: 5,
      priority: TaskPriority.HIGH,
      status: TaskStatus.BLOCKED,
      assignedToId: coordinator.id,
      requestedById: owner.id,
      errorMessage: "Awaiting updated business license from client",
    },

    // ─── Coastal Bites Restaurant (AT_RISK, clients[4]) ───
    {
      taskId: "M1-SENTIMENT-01",
      clientId: clients[4].id,
      title: "Review sentiment analysis",
      description:
        "Analyze last 90 days of reviews for Coastal Bites to identify negative sentiment patterns and root causes of 1-star ratings",
      module: "M1",
      sprint: 4,
      priority: TaskPriority.HIGH,
      status: TaskStatus.IN_PROGRESS,
      assignedToId: coordinator.id,
      requestedById: owner.id,
      startedAt: DAYS_AGO(1),
    },
    {
      taskId: "M1-GAP-01",
      clientId: clients[4].id,
      title: "Competitor gap analysis",
      description:
        "Run competitor gap analysis for Coastal Bites vs top 5 seafood restaurants in San Diego map pack",
      module: "M1",
      sprint: 3,
      priority: TaskPriority.HIGH,
      status: TaskStatus.NOT_STARTED,
      assignedToId: coordinator.id,
      requestedById: approver.id,
      scheduledFor: DAYS_AGO(-2),
    },
    {
      taskId: "M6-RECOVERY-01",
      clientId: clients[4].id,
      title: "Recovery action plan",
      description:
        "Create comprehensive recovery action plan addressing suspension, review score decline, and competitor gaps for Coastal Bites",
      module: "M6",
      sprint: 1,
      priority: TaskPriority.CRITICAL,
      status: TaskStatus.NOT_STARTED,
      assignedToId: owner.id,
      requestedById: owner.id,
      scheduledFor: DAYS_AGO(-1),
    },

    // ─── Round 11: Additional 20 tasks across ALL clients ───
    {
      taskId: "M1-ONBOARD-01",
      clientId: clients[2].id,
      title: "Verify business license & documentation",
      description:
        "Collect and verify Bloom Garden Design business license, insurance docs, and tax ID for GBP claim",
      module: "M1",
      sprint: 2,
      priority: TaskPriority.CRITICAL,
      status: TaskStatus.NOT_STARTED,
      assignedToId: coordinator.id,
      requestedById: owner.id,
    },
    {
      taskId: "M2-SITE-AUDIT-01",
      clientId: clients[2].id,
      title: "Website audit & schema setup",
      description:
        "Audit Bloom Garden website for SEO fundamentals, add LocalBusiness schema markup",
      module: "M2",
      sprint: 5,
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.NOT_STARTED,
      assignedToId: coordinator.id,
      requestedById: owner.id,
      scheduledFor: DAYS_AGO(-10),
    },
    {
      taskId: "M5-BASELINE-01",
      clientId: clients[2].id,
      title: "Baseline KPI snapshot",
      description:
        "Capture baseline KPIs for Bloom Garden including search impressions, website traffic, and lead volume",
      module: "M5",
      sprint: 5,
      priority: TaskPriority.HIGH,
      status: TaskStatus.NOT_STARTED,
      assignedToId: approver.id,
      requestedById: owner.id,
      scheduledFor: DAYS_AGO(-8),
    },
    {
      taskId: "M1-INTAKE-02",
      clientId: clients[2].id,
      title: "Service area & category selection",
      description:
        "Define primary service area radius and GBP category hierarchy for landscaping business",
      module: "M1",
      sprint: 2,
      priority: TaskPriority.HIGH,
      status: TaskStatus.NOT_STARTED,
      assignedToId: coordinator.id,
      requestedById: coordinator.id,
      scheduledFor: DAYS_AGO(-2),
    },
    {
      taskId: "M1-PHOTO-BLAST-01",
      clientId: clients[3].id,
      title: "Photo content blast (12 photos)",
      description:
        "Coordinate photo shoot for PeakFit Gym — equipment, classes, trainers, facility exterior/interior",
      module: "M1",
      sprint: 4,
      priority: TaskPriority.HIGH,
      status: TaskStatus.NOT_STARTED,
      assignedToId: coordinator.id,
      requestedById: owner.id,
      scheduledFor: DAYS_AGO(-3),
    },
    {
      taskId: "M3-CITATION-01",
      clientId: clients[3].id,
      title: "Build top-tier citation profiles",
      description:
        "Create/update citations on Yelp, YellowPages, BBB, Angi, and Thumbtack for PeakFit Gym Denver",
      module: "M3",
      sprint: 7,
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.NOT_STARTED,
      assignedToId: viewer.id,
      requestedById: coordinator.id,
      scheduledFor: DAYS_AGO(-5),
    },
    {
      taskId: "M5-REPORT-01",
      clientId: clients[3].id,
      title: "Monthly performance report",
      description:
        "Generate and send July performance report for PeakFit with keyword rankings, leads, and recommendations",
      module: "M5",
      sprint: 6,
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.NOT_STARTED,
      assignedToId: coordinator.id,
      requestedById: owner.id,
      scheduledFor: DAYS_AGO(-6),
    },
    {
      taskId: "M1-VERIFY-01",
      clientId: clients[1].id,
      title: "GBP verification check",
      description:
        "Verify QuickFix GBP is properly verified and all data is consistent across Google platforms",
      module: "M1",
      sprint: 2,
      priority: TaskPriority.HIGH,
      status: TaskStatus.DONE,
      assignedToId: approver.id,
      requestedById: owner.id,
      completedAt: DAYS_AGO(10),
    },
    {
      taskId: "M2-TRACKING-01",
      clientId: clients[1].id,
      title: "GA4 & GSC setup",
      description:
        "Set up Google Analytics 4 and Google Search Console tracking for QuickFix Plumbing website",
      module: "M2",
      sprint: 5,
      priority: TaskPriority.HIGH,
      status: TaskStatus.NOT_STARTED,
      assignedToId: coordinator.id,
      requestedById: owner.id,
      scheduledFor: DAYS_AGO(-4),
    },
    {
      taskId: "M5-KW-TRACK-01",
      clientId: clients[1].id,
      title: "Keyword tracking initialization",
      description:
        "Initialize keyword rank tracking for 12 target keywords in Austin plumbing market",
      module: "M5",
      sprint: 5,
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.NOT_STARTED,
      assignedToId: viewer.id,
      requestedById: coordinator.id,
      scheduledFor: DAYS_AGO(-6),
    },
    {
      taskId: "M6-PAUSE-REVIEW-01",
      clientId: clients[5].id,
      title: "Pause reason documentation",
      description:
        "Document detailed pause reasons and create reactivation checklist for TechRepair Hub",
      module: "M6",
      sprint: 1,
      priority: TaskPriority.LOW,
      status: TaskStatus.NOT_STARTED,
      assignedToId: approver.id,
      requestedById: owner.id,
      scheduledFor: DAYS_AGO(-5),
    },
    {
      taskId: "M1-DATA-CLEANUP-01",
      clientId: clients[5].id,
      title: "Data cleanup before reactivation",
      description:
        "Clean up stale data, old Q&A, and outdated GBP info before TechRepair re-engagement",
      module: "M1",
      sprint: 5,
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.NOT_STARTED,
      assignedToId: viewer.id,
      requestedById: coordinator.id,
      scheduledFor: DAYS_AGO(-7),
    },
    {
      taskId: "M1-REVIEW-RESPONSE-01",
      clientId: clients[4].id,
      title: "Critical review response drafting",
      description:
        "Draft professional, empathetic responses to the 3 most critical 1-star reviews for Coastal Bites",
      module: "M1",
      sprint: 4,
      priority: TaskPriority.CRITICAL,
      status: TaskStatus.IN_PROGRESS,
      assignedToId: coordinator.id,
      requestedById: owner.id,
      startedAt: DAYS_AGO(1),
    },
    {
      taskId: "M5-ANOMALY-01",
      clientId: clients[4].id,
      title: "Traffic anomaly investigation",
      description:
        "Investigate 40% traffic drop for Coastal Bites website — check GSC, manual actions, and competitor changes",
      module: "M5",
      sprint: 6,
      priority: TaskPriority.HIGH,
      status: TaskStatus.NOT_STARTED,
      assignedToId: coordinator.id,
      requestedById: approver.id,
      scheduledFor: DAYS_AGO(-3),
    },
    {
      taskId: "M1-REVIEW-ASK-01",
      clientId: clients[6].id,
      title: "Review generation campaign",
      description:
        "Set up WhatsApp + email review ask flow for Paws & Claws recent clients",
      module: "M1",
      sprint: 4,
      priority: TaskPriority.HIGH,
      status: TaskStatus.NOT_STARTED,
      assignedToId: coordinator.id,
      requestedById: owner.id,
      scheduledFor: DAYS_AGO(-2),
    },
    {
      taskId: "M3-AUDIT-02",
      clientId: clients[6].id,
      title: "NAP consistency audit",
      description:
        "Audit NAP (Name, Address, Phone) consistency across top 30 citation directories for Paws & Claws Portland",
      module: "M3",
      sprint: 7,
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.NOT_STARTED,
      assignedToId: viewer.id,
      requestedById: coordinator.id,
      scheduledFor: DAYS_AGO(-8),
    },
    {
      taskId: "M1-FAQ-01",
      clientId: clients[7].id,
      title: "GBP FAQ content creation",
      description:
        "Create 10 FAQ entries for Luxe Auto Detailing GBP covering ceramic coating, pricing, and process questions",
      module: "M1",
      sprint: 4,
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.NOT_STARTED,
      assignedToId: coordinator.id,
      requestedById: owner.id,
      scheduledFor: DAYS_AGO(-1),
    },
    {
      taskId: "M2-SPEED-01",
      clientId: clients[7].id,
      title: "Page speed optimization",
      description:
        "Audit and optimize Luxe Auto website for Core Web Vitals — target LCP < 2.5s, CLS < 0.1",
      module: "M2",
      sprint: 5,
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.NOT_STARTED,
      assignedToId: coordinator.id,
      requestedById: approver.id,
      scheduledFor: DAYS_AGO(-6),
    },
    {
      taskId: "M3-TIER2-BUILD-01",
      clientId: clients[0].id,
      title: "Tier 2 citation building",
      description:
        "Build citations on 25+ Tier 2 directories (Manta, Hotfrog, Foursquare, etc.) for SparkleClean Dallas",
      module: "M3",
      sprint: 7,
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.NOT_STARTED,
      assignedToId: viewer.id,
      requestedById: coordinator.id,
      scheduledFor: DAYS_AGO(-4),
    },
    {
      taskId: "M5-SELF-CORRECT-01",
      clientId: clients[0].id,
      title: "Self-correction diagnosis setup",
      description:
        "Configure 5 anomaly detection rules for SparkleClean — ranking drops, traffic spikes, review velocity, citation changes",
      module: "M5",
      sprint: 6,
      priority: TaskPriority.HIGH,
      status: TaskStatus.NOT_STARTED,
      assignedToId: coordinator.id,
      requestedById: owner.id,
      scheduledFor: DAYS_AGO(-5),
    },
  ];

  for (const t of taskData) {
    const { clientId, assignedToId, requestedById, ...rest } = t;
    await prisma.task.upsert({
      where: { idempotencyKey: `seed-${t.taskId}-${clientId || "system"}` },
      update: {},
      create: {
        ...rest,
        idempotencyKey: `seed-${t.taskId}-${clientId || "system"}`,
        ...(clientId ? { client: { connect: { id: clientId } } } : {}),
        ...(assignedToId
          ? { assignedTo: { connect: { id: assignedToId } } }
          : {}),
        ...(requestedById
          ? { requestedBy: { connect: { id: requestedById } } }
          : {}),
      },
    });
  }

  // ─── Task Logs ───
  const allTasks = await prisma.task.findMany();
  const logEntries = [
    {
      taskId: allTasks.find(
        (t) => t.taskId === "M1-5.1" && t.clientId === clients[0].id,
      )?.id,
      level: "INFO",
      message: "Starting description optimization for SparkleClean",
    },
    {
      taskId: allTasks.find(
        (t) => t.taskId === "M1-5.1" && t.clientId === clients[0].id,
      )?.id,
      level: "INFO",
      message: "Pulled current GBP description (312 chars)",
    },
    {
      taskId: allTasks.find(
        (t) => t.taskId === "M1-5.1" && t.clientId === clients[0].id,
      )?.id,
      level: "WARN",
      message:
        "Banned content check: found phone number in draft description — removing",
    },
    {
      taskId: allTasks.find(
        (t) => t.taskId === "M1-5.1" && t.clientId === clients[0].id,
      )?.id,
      level: "INFO",
      message: "Description rewritten: 748 chars, all linter checks passed",
    },
    {
      taskId: allTasks.find(
        (t) => t.taskId === "M1-1.1" && t.clientId === clients[1].id,
      )?.id,
      level: "INFO",
      message: "Starting service taxonomy for QuickFix Plumbing",
    },
    {
      taskId: allTasks.find(
        (t) => t.taskId === "M1-1.1" && t.clientId === clients[1].id,
      )?.id,
      level: "INFO",
      message:
        "Identified 8 parent categories and 23 sub-services from DataForSEO data",
    },
    {
      taskId: allTasks.find(
        (t) => t.taskId === "M1-5.1" && t.clientId === clients[3].id,
      )?.id,
      level: "ERROR",
      message: "DataForSEO API returned 429: Rate limit exceeded",
    },
    {
      taskId: allTasks.find(
        (t) => t.taskId === "M1-5.1" && t.clientId === clients[3].id,
      )?.id,
      level: "ERROR",
      message: "Retry 2/3 failed: Still rate-limited. Moving to FAILED state.",
    },
  ];

  for (const l of logEntries) {
    if (l.taskId) {
      await prisma.taskLog.create({
        data: {
          taskId: l.taskId,
          level: l.level,
          message: l.message,
          createdAt: DAYS_AGO(1),
        },
      });
    }
  }

  // ─── Approval Requests ───
  const approvalData = [
    {
      clientId: clients[0].id,
      taskId: allTasks.find(
        (t) => t.taskId === "M1-5.1" && t.clientId === clients[0].id,
      )?.id,
      title: "GBP Description Update — SparkleClean",
      description:
        "Coordinator Sarah Chen has drafted a new 748-character GBP description. Requires approval before publishing via GBP API.",
      requestType: "DESCRIPTION_UPDATE",
      requestData:
        '{"field":"description","oldValue":"Professional cleaning services for homes and businesses.","newValue":"SparkleClean Pro delivers expert residential & commercial cleaning across Dallas-Fort Worth. Voted #1 cleaning service 2025. 500+ happy customers, eco-friendly products, same-day booking available. Licensed, bonded & insured."}',
      status: ApprovalStatus.PENDING,
      requestedById: coordinator.id,
      expiresAt: DAYS_AGO(-5),
    },
    {
      clientId: clients[1].id,
      taskId: allTasks.find(
        (t) => t.taskId === "M1-2.1" && t.clientId === clients[1].id,
      )?.id,
      title: "Keyword Research Results — QuickFix Plumbing",
      description:
        "Keyword research for Austin plumbing market completed. 12 target keywords identified with volume/difficulty data. Ready to populate KeywordMap.",
      requestType: "KEYWORD_RESEARCH",
      requestData:
        '{"keywordCount":12,"avgDifficulty":42,"topKeyword":"plumber austin tx"}',
      status: ApprovalStatus.PENDING,
      requestedById: coordinator.id,
      expiresAt: DAYS_AGO(-3),
    },
    {
      clientId: clients[4].id,
      title: "Suspension Response Plan — Coastal Bites",
      description:
        "GBP profile for Coastal Bites has been suspended. Prepared response plan including documentation of business legitimacy and request for reinstatement.",
      requestType: "SUSPENSION_RESPONSE",
      requestData:
        '{"suspensionReason":"疑似虚假评论","responseStrategy":"提交营业执照 + 税务证明 + 5条真实客户证词"}',
      status: ApprovalStatus.PENDING,
      requestedById: owner.id,
      expiresAt: DAYS_AGO(-1),
    },
    {
      clientId: clients[0].id,
      title: "Primary Category Change — SparkleClean",
      description:
        "Requesting change from 'Cleaning Service' to 'Janitorial Service' to better match search intent data showing 3x more searches for janitorial terms.",
      requestType: "CATEGORY_CHANGE",
      requestData:
        '{"current":"Cleaning Service","proposed":"Janitorial Service","reason":"Search volume 3x higher"}',
      status: ApprovalStatus.APPROVED,
      requestedById: coordinator.id,
      approvedById: approver.id,
      reviewedAt: DAYS_AGO(5),
    },
    {
      clientId: clients[3].id,
      title: "Post Publication — PeakFit Grand Opening Offer",
      description:
        "Monthly post for PeakFit Gym: 'New Year, New You — 20% off 3-month personal training packages. Limited spots available!'",
      requestType: "POST_PUBLISH",
      requestData:
        '{"postType":"OFFER","title":"New Year Special","cta":"Book Now"}',
      status: ApprovalStatus.REJECTED,
      requestedById: coordinator.id,
      approvedById: approver.id,
      rejectedReason:
        "Post contains promotional pricing that hasn't been verified by the business owner. Please confirm rates before resubmitting.",
      reviewedAt: DAYS_AGO(3),
    },
  ];

  for (const a of approvalData) {
    const { clientId, taskId, requestedById, approvedById, ...rest } = a as any;
    await prisma.approvalRequest.create({
      data: {
        ...rest,
        ...(clientId ? { client: { connect: { id: clientId } } } : {}),
        ...(taskId ? { task: { connect: { id: taskId } } } : {}),
        requestedBy: { connect: { id: requestedById } },
        ...(approvedById
          ? { approvedBy: { connect: { id: approvedById } } }
          : {}),
      },
    });
  }

  // ─── Change Log ───
  const changeLogData = [
    {
      clientId: clients[0].id,
      module: "M1",
      entityType: "GbpProfile",
      entityId: (await prisma.gbpProfile.findFirst({
        where: { clientId: clients[0].id },
      }))!.id,
      field: "primaryCategory",
      oldValue: null,
      newValue: "Cleaning Service",
      changedById: owner.id,
      createdAt: DAYS_AGO(30),
    },
    {
      clientId: clients[0].id,
      module: "M1",
      entityType: "GbpProfile",
      entityId: (await prisma.gbpProfile.findFirst({
        where: { clientId: clients[0].id },
      }))!.id,
      field: "description",
      oldValue: "Old description text",
      newValue: "Professional cleaning services...",
      changedById: coordinator.id,
      createdAt: DAYS_AGO(28),
    },
    {
      clientId: clients[0].id,
      module: "M1",
      entityType: "GbpProfile",
      entityId: (await prisma.gbpProfile.findFirst({
        where: { clientId: clients[0].id },
      }))!.id,
      field: "secondaryCategories",
      oldValue: "[]",
      newValue: '["House Cleaning","Commercial Cleaning"]',
      changedById: coordinator.id,
      createdAt: DAYS_AGO(27),
    },
    {
      clientId: clients[0].id,
      module: "M6",
      entityType: "Client",
      entityId: clients[0].id,
      field: "lifecycleState",
      oldValue: "BUILD",
      newValue: "GROWTH",
      changedById: owner.id,
      createdAt: DAYS_AGO(15),
    },
    {
      clientId: clients[1].id,
      module: "M1",
      entityType: "GbpProfile",
      entityId: (await prisma.gbpProfile.findFirst({
        where: { clientId: clients[1].id },
      }))!.id,
      field: "isVerified",
      oldValue: "false",
      newValue: "true",
      changedById: approver.id,
      createdAt: DAYS_AGO(20),
    },
    {
      clientId: clients[3].id,
      module: "M1",
      entityType: "GbpPost",
      field: "status",
      oldValue: "DRAFT",
      newValue: "PUBLISHED",
      changedById: coordinator.id,
      createdAt: DAYS_AGO(8),
    },
    {
      clientId: clients[4].id,
      module: "M1",
      entityType: "GbpProfile",
      entityId: (await prisma.gbpProfile.findFirst({
        where: { clientId: clients[4].id },
      }))!.id,
      field: "isSuspended",
      oldValue: "false",
      newValue: "true",
      changedById: null,
      createdAt: DAYS_AGO(1),
    },
    // Round 11: 5 more change log entries
    {
      clientId: clients[3].id,
      module: "M1",
      entityType: "GbpProfile",
      entityId: (await prisma.gbpProfile.findFirst({
        where: { clientId: clients[3].id },
      }))!.id,
      field: "primaryCategory",
      oldValue: "Gym",
      newValue: "Personal Trainer",
      changedById: coordinator.id,
      createdAt: DAYS_AGO(6),
    },
    {
      clientId: clients[7].id,
      module: "M6",
      entityType: "Client",
      entityId: clients[7].id,
      field: "lifecycleState",
      oldValue: "BUILD",
      newValue: "GROWTH",
      changedById: owner.id,
      createdAt: DAYS_AGO(10),
    },
    {
      clientId: clients[0].id,
      module: "M1",
      entityType: "GbpPost",
      field: "status",
      oldValue: "DRAFT",
      newValue: "PUBLISHED",
      changedById: coordinator.id,
      createdAt: DAYS_AGO(4),
    },
    {
      clientId: clients[1].id,
      module: "M6",
      entityType: "Client",
      entityId: clients[1].id,
      field: "lifecycleState",
      oldValue: "ONBOARDING",
      newValue: "BUILD",
      changedById: approver.id,
      createdAt: DAYS_AGO(12),
    },
    {
      clientId: clients[6].id,
      module: "M1",
      entityType: "GbpProfile",
      entityId: (await prisma.gbpProfile.findFirst({
        where: { clientId: clients[6].id },
      }))!.id,
      field: "primaryCategory",
      oldValue: "Animal Hospital",
      newValue: "Veterinarian",
      changedById: coordinator.id,
      createdAt: DAYS_AGO(5),
    },
  ];

  for (const cl of changeLogData) {
    await prisma.changeLogEntry.create({ data: cl });
  }

  // ─── Leads ───
  const leadData = [
    {
      clientId: clients[0].id,
      source: LeadSource.GBP_CALL,
      value: 250,
      notes: "Called about recurring cleaning service",
      createdAt: DAYS_AGO(1),
    },
    {
      clientId: clients[0].id,
      source: LeadSource.GBP_WEBSITE,
      value: 180,
      notes: "Booked deep cleaning through website",
      createdAt: DAYS_AGO(2),
      convertedAt: DAYS_AGO(2),
    },
    {
      clientId: clients[0].id,
      source: LeadSource.GBP_DIRECTIONS,
      value: 0,
      notes: "Requested driving directions to office",
      createdAt: DAYS_AGO(3),
    },
    {
      clientId: clients[0].id,
      source: LeadSource.GBP_CALL,
      value: 400,
      notes: "Inquiry about commercial cleaning for office building",
      createdAt: DAYS_AGO(5),
      convertedAt: DAYS_AGO(4),
    },
    {
      clientId: clients[1].id,
      source: LeadSource.GBP_CALL,
      value: 350,
      notes: "Emergency plumbing — burst pipe",
      createdAt: DAYS_AGO(1),
      convertedAt: DAYS_AGO(1),
    },
    {
      clientId: clients[1].id,
      source: LeadSource.GBP_WEBSITE,
      value: 200,
      notes: "Scheduled water heater maintenance",
      createdAt: DAYS_AGO(4),
    },
    {
      clientId: clients[3].id,
      source: LeadSource.GBP_CALL,
      value: 500,
      notes: "Interested in 6-month personal training package",
      createdAt: DAYS_AGO(2),
      convertedAt: DAYS_AGO(1),
    },
    {
      clientId: clients[3].id,
      source: LeadSource.ORGANIC_SEARCH,
      value: 150,
      notes: "Found through 'personal trainer denver' search",
      createdAt: DAYS_AGO(6),
    },
    {
      clientId: clients[7].id,
      source: LeadSource.GBP_CALL,
      value: 300,
      notes: "Full ceramic coating for new car",
      createdAt: DAYS_AGO(3),
      convertedAt: DAYS_AGO(2),
    },
    {
      clientId: clients[7].id,
      source: LeadSource.WHATSAPP,
      value: 200,
      notes: "WhatsApp inquiry about pricing",
      createdAt: DAYS_AGO(1),
    },
    // Round 11: 10 more leads
    {
      clientId: clients[0].id,
      source: LeadSource.ORGANIC_SEARCH,
      value: 150,
      notes: "Found through 'cleaning service dallas' search",
      createdAt: DAYS_AGO(8),
    },
    {
      clientId: clients[1].id,
      source: LeadSource.FORM_SUBMISSION,
      value: 500,
      notes: "Submitted contact form for bathroom remodel estimate",
      createdAt: DAYS_AGO(3),
    },
    {
      clientId: clients[1].id,
      source: LeadSource.GBP_DIRECTIONS,
      value: 0,
      notes: "Requested directions to office from GBP",
      createdAt: DAYS_AGO(6),
    },
    {
      clientId: clients[3].id,
      source: LeadSource.FORM_SUBMISSION,
      value: 350,
      notes: "Signed up for free trial class via website",
      createdAt: DAYS_AGO(4),
      convertedAt: DAYS_AGO(3),
    },
    {
      clientId: clients[4].id,
      source: LeadSource.PHONE_CALL,
      value: 180,
      notes: "Called about catering for 50-person event",
      createdAt: DAYS_AGO(2),
    },
    {
      clientId: clients[6].id,
      source: LeadSource.GBP_CALL,
      value: 400,
      notes: "New puppy vaccination appointment request",
      createdAt: DAYS_AGO(3),
      convertedAt: DAYS_AGO(2),
    },
    {
      clientId: clients[6].id,
      source: LeadSource.ORGANIC_SEARCH,
      value: 220,
      notes: "Searched for 'vet near me portland'",
      createdAt: DAYS_AGO(5),
    },
    {
      clientId: clients[7].id,
      source: LeadSource.EMAIL,
      value: 600,
      notes: "Fleet of 5 vehicles inquiry from local dealership",
      createdAt: DAYS_AGO(2),
    },
    {
      clientId: clients[0].id,
      source: LeadSource.REFERRAL,
      value: 350,
      notes: "Referred by existing customer Maria Garcia",
      createdAt: DAYS_AGO(4),
      convertedAt: DAYS_AGO(3),
    },
    {
      clientId: clients[3].id,
      source: LeadSource.GBP_DIRECTIONS,
      value: 0,
      notes: "Got directions from GBP to gym",
      createdAt: DAYS_AGO(7),
    },
  ];

  for (const l of leadData) {
    await prisma.leadLogEntry.create({ data: l });
  }

  // ─── Build Requirements (from Sprint Plan) ───
  const reqData = [
    // Sprint 0
    {
      reqId: "REQ-CORE-01",
      title: "Organization model seeded (single fixed row)",
      module: "CORE",
      sprint: 0,
      status: ReqStatus.DONE,
    },
    {
      reqId: "REQ-CORE-02",
      title: "StaffUser model with RBAC roles",
      module: "CORE",
      sprint: 0,
      status: ReqStatus.DONE,
    },
    {
      reqId: "REQ-CORE-03",
      title: "Client model with lifecycle state machine",
      module: "CORE",
      sprint: 0,
      status: ReqStatus.DONE,
    },
    {
      reqId: "REQ-AUTH-01",
      title: "Auth.js login for Owner staff user",
      module: "AUTH",
      sprint: 0,
      status: ReqStatus.DONE,
    },
    {
      reqId: "REQ-AUTH-02",
      title: "Role-based access control enforcement",
      module: "AUTH",
      sprint: 0,
      status: ReqStatus.IN_PROGRESS,
    },
    {
      reqId: "REQ-SEC-01",
      title: "Client-level data isolation (RLS-equivalent)",
      module: "SEC",
      sprint: 0,
      status: ReqStatus.IN_PROGRESS,
    },
    {
      reqId: "REQ-META-01",
      title: "Build Status screen showing verified REQ completion",
      module: "META",
      sprint: 0,
      status: ReqStatus.IN_PROGRESS,
      blockedBy: "Seed now corrected; automated evidence links still pending",
    },
    {
      reqId: "REQ-NFR-04",
      title: "Mobile-responsive UI verified across required viewports",
      module: "NFR",
      sprint: 0,
      status: ReqStatus.IN_PROGRESS,
      blockedBy:
        "Viewport, accessibility, bundle, and Lighthouse gates pending",
    },
    // Sprint 1
    {
      reqId: "REQ-M6-01",
      title: "Client lifecycle state machine",
      module: "M6",
      sprint: 1,
      status: ReqStatus.DONE,
    },
    {
      reqId: "REQ-M6-02",
      title: "Illegal state transition validation",
      module: "M6",
      sprint: 1,
      status: ReqStatus.DONE,
    },
    {
      reqId: "REQ-M6-03",
      title: "Task model with priority ordering",
      module: "M6",
      sprint: 1,
      status: ReqStatus.IN_PROGRESS,
      blockedBy:
        "Numeric shared priority classifier and dependency ordering pending",
    },
    {
      reqId: "REQ-M6-04",
      title: "BullMQ-style job scheduling (simulated)",
      module: "M6",
      sprint: 1,
      status: ReqStatus.IN_PROGRESS,
    },
    {
      reqId: "REQ-M6-05",
      title: "Idempotent writer service",
      module: "M6",
      sprint: 1,
      status: ReqStatus.IN_PROGRESS,
    },
    {
      reqId: "REQ-M6-06",
      title: "Retry with exponential backoff (max 3)",
      module: "M6",
      sprint: 1,
      status: ReqStatus.IN_PROGRESS,
    },
    {
      reqId: "REQ-M6-07",
      title: "Read-back verification after external writes",
      module: "M6",
      sprint: 1,
      status: ReqStatus.NOT_STARTED,
    },
    {
      reqId: "REQ-M6-STATE-01",
      title: "State machine: ONBOARDING → BUILD transition",
      module: "M6",
      sprint: 1,
      status: ReqStatus.DONE,
    },
    {
      reqId: "REQ-M6-STATE-02",
      title: "State machine: BUILD → GROWTH transition",
      module: "M6",
      sprint: 1,
      status: ReqStatus.DONE,
    },
    {
      reqId: "REQ-M6-STATE-03",
      title: "State machine: GROWTH → AT_RISK transition",
      module: "M6",
      sprint: 1,
      status: ReqStatus.DONE,
    },
    {
      reqId: "REQ-M6-STATE-04",
      title: "State machine: AT_RISK → PAUSED / back to GROWTH",
      module: "M6",
      sprint: 1,
      status: ReqStatus.DONE,
    },
    {
      reqId: "REQ-M6-TASK-01",
      title: "Task CRUD operations",
      module: "M6",
      sprint: 1,
      status: ReqStatus.DONE,
    },
    {
      reqId: "REQ-M6-TASK-02",
      title: "Task status workflow",
      module: "M6",
      sprint: 1,
      status: ReqStatus.DONE,
    },
    {
      reqId: "REQ-M6-TASK-03",
      title: "Task log entries",
      module: "M6",
      sprint: 1,
      status: ReqStatus.DONE,
    },
    {
      reqId: "REQ-M6-APPR-01",
      title: "Approval queue with 4-eyes principle",
      module: "M6",
      sprint: 1,
      status: ReqStatus.IN_PROGRESS,
      blockedBy: "Shared approval guard missing for every gated action",
    },
    {
      reqId: "REQ-M6-APPR-02",
      title: "Approval expiry and linked task blocking",
      module: "M6",
      sprint: 1,
      status: ReqStatus.DONE,
    },
    // Sprint 2 (GBP Foundation)
    {
      reqId: "REQ-M1-01",
      title: "Client intake questionnaire form",
      module: "M1",
      sprint: 2,
      status: ReqStatus.NOT_STARTED,
    },
    {
      reqId: "REQ-M1-02",
      title: "GBP OAuth connect flow",
      module: "M1",
      sprint: 2,
      status: ReqStatus.IN_PROGRESS,
      blockedBy:
        "Service-name normalization and end-to-end callback tests pending",
    },
    {
      reqId: "REQ-M1-03",
      title: "Claim/create/verify wizard",
      module: "M1",
      sprint: 2,
      status: ReqStatus.NOT_STARTED,
    },
    {
      reqId: "REQ-M1-04",
      title: "SAB vs address setup toggle",
      module: "M1",
      sprint: 2,
      status: ReqStatus.NOT_STARTED,
    },
    // Sprint 3 (GBP Research)
    {
      reqId: "REQ-M1-05",
      title: "Service taxonomy builder",
      module: "M1",
      sprint: 3,
      status: ReqStatus.IN_PROGRESS,
      blockedBy: "Live taxonomy and attribute sync pending",
    },
    {
      reqId: "REQ-M1-06",
      title: "Keyword research via DataForSEO",
      module: "M1",
      sprint: 3,
      status: ReqStatus.IN_PROGRESS,
      blockedBy: "Full live provider lineage pending",
    },
    {
      reqId: "REQ-M1-07",
      title: "Competitor teardown analysis",
      module: "M1",
      sprint: 3,
      status: ReqStatus.IN_PROGRESS,
      blockedBy: "Real competitor ingestion and lineage pending",
    },
    {
      reqId: "REQ-M1-08",
      title: "Primary category change with approval",
      module: "M1",
      sprint: 3,
      status: ReqStatus.IN_PROGRESS,
      blockedBy: "Shared approval guard coverage pending",
    },
    {
      reqId: "REQ-M1-09",
      title: "Description editor with banned-content linter",
      module: "M1",
      sprint: 3,
      status: ReqStatus.IN_PROGRESS,
    },
    {
      reqId: "REQ-M1-10",
      title: "Photo pipeline with benchmark tracking",
      module: "M1",
      sprint: 3,
      status: ReqStatus.NOT_STARTED,
    },
    // Sprint 4 (GBP Engagement)
    {
      reqId: "REQ-M1-11",
      title: "Monthly post calendar generator",
      module: "M1",
      sprint: 4,
      status: ReqStatus.NOT_STARTED,
    },
    {
      reqId: "REQ-M1-12",
      title: "Review-ask flow (WhatsApp + email)",
      module: "M1",
      sprint: 4,
      status: ReqStatus.BLOCKED,
      blockedBy: "WhatsApp Business template approval pending",
    },
    {
      reqId: "REQ-M1-13",
      title: "Auto-response guard (≤2★ blocked)",
      module: "M1",
      sprint: 4,
      status: ReqStatus.NOT_STARTED,
    },
    {
      reqId: "REQ-M1-14",
      title: "FAQ content management",
      module: "M1",
      sprint: 4,
      status: ReqStatus.NOT_STARTED,
    },
    {
      reqId: "REQ-M1-15",
      title: "Booking URL reachability check",
      module: "M1",
      sprint: 4,
      status: ReqStatus.IN_PROGRESS,
      blockedBy: "Warning/override audit behavior differs from spec",
    },
    // Sprint 5 (Advanced)
    {
      reqId: "REQ-M1-16",
      title: "Geo-grid scan with heatmap",
      module: "M1",
      sprint: 5,
      status: ReqStatus.BLOCKED,
      blockedBy: "Local Falcon API tier ($199/mo) not yet subscribed",
    },
    {
      reqId: "REQ-M1-17",
      title: "Freshness engine (14-day alert)",
      module: "M1",
      sprint: 5,
      status: ReqStatus.IN_PROGRESS,
      blockedBy: "Uses notifications; Alert model/rule lineage pending",
    },
    {
      reqId: "REQ-M1-18",
      title: "Monthly spam sweep",
      module: "M1",
      sprint: 5,
      status: ReqStatus.NOT_STARTED,
    },
    {
      reqId: "REQ-M1-19",
      title: "Suspension-response wizard",
      module: "M1",
      sprint: 5,
      status: ReqStatus.IN_PROGRESS,
    },
    // Module 3 (Citations)
    {
      reqId: "REQ-M3-01",
      title: "Citation audit via BrightLocal",
      module: "M3",
      sprint: 7,
      status: ReqStatus.BLOCKED,
      blockedBy: "BrightLocal Grow subscription required",
    },
    {
      reqId: "REQ-M3-02",
      title: "Tiered citation building workflow",
      module: "M3",
      sprint: 7,
      status: ReqStatus.NOT_STARTED,
    },
    {
      reqId: "REQ-M3-03",
      title: "Backlink gap mining via DataForSEO",
      module: "M3",
      sprint: 7,
      status: ReqStatus.NOT_STARTED,
    },
    {
      reqId: "REQ-M3-04",
      title: "Secondary review platform display (read-only)",
      module: "M3",
      sprint: 7,
      status: ReqStatus.NOT_STARTED,
    },
    // Module 5 (Analytics)
    {
      reqId: "REQ-M5-01",
      title: "GA4 event tracking (5 event types)",
      module: "M5",
      sprint: 5,
      status: ReqStatus.NOT_STARTED,
    },
    {
      reqId: "REQ-M5-02",
      title: "Baseline KPI snapshot (immutable)",
      module: "M5",
      sprint: 5,
      status: ReqStatus.IN_PROGRESS,
      blockedBy:
        "Immutable storage exists; full baseline capture workflow pending",
    },
    {
      reqId: "REQ-M5-03",
      title: "Anomaly detection (5 rule types)",
      module: "M5",
      sprint: 6,
      status: ReqStatus.IN_PROGRESS,
      blockedBy:
        "Scheduled notification-backed anomaly rules exist; simulated-data behavioral tests pending",
    },
    {
      reqId: "REQ-M5-04",
      title: "Self-correction diagnosis workflow",
      module: "M5",
      sprint: 6,
      status: ReqStatus.NOT_STARTED,
    },
    {
      reqId: "REQ-M5-05",
      title: "Monthly report v2 with competitor comparison",
      module: "M5",
      sprint: 6,
      status: ReqStatus.DEFERRED,
    },
    // Scope
    {
      reqId: "REQ-SCOPE-01",
      title: "v1 scope boundary: M1 full + M6 full + M2-5 reduced",
      module: "META",
      sprint: 0,
      status: ReqStatus.IN_PROGRESS,
      blockedBy: "M1 and M6 are still partial in verified gap tracker",
    },
  ];

  for (const r of reqData) {
    await prisma.buildRequirement.upsert({
      where: { reqId: r.reqId },
      update: {
        title: r.title,
        module: r.module,
        sprint: r.sprint,
        status: r.status,
        blockedBy: r.blockedBy ?? null,
      },
      create: r,
    });
  }

  console.log("✅ Seed completed successfully!");
  console.log(`   - Organization: ${org.name}`);
  console.log(`   - Staff Users: 4`);
  console.log(`   - Clients: ${clients.length}`);
  console.log(`   - Tasks: ${taskData.length}`);
  console.log(`   - Approval Requests: ${approvalData.length}`);
  console.log(`   - Build Requirements: ${reqData.length}`);
  console.log(`   - Keywords: ${keywordData.length}`);
  console.log(`   - Leads: ${leadData.length}`);
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
