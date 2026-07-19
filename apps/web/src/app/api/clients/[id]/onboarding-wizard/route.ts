import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-guard";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole('OWNER', 'COORDINATOR');
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json();
    const { hasSite, isIndexable, hasCmsLogin, wantsSite } = body;

    const client = await db.client.findUnique({
      where: { id }
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Determine target onboarding state
    let newState: 'ONBOARDING' | 'BUILD' | 'GROWTH' = 'ONBOARDING';
    let taskTitle = '';
    let taskDesc = '';
    let taskPriority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
    let subtasksList: string[] = [];

    if (hasSite) {
      if (!hasCmsLogin) {
        // Scenario A: Has site, no CMS login
        newState = 'BUILD';
        taskTitle = 'Request CMS Login credentials and hosting details';
        taskDesc = `Client has an existing website but does not have CMS login credentials.\n\nWe must retrieve access details to their CMS/hosting environment to run audits and configure local schema headers.`;
        taskPriority = 'HIGH';
        subtasksList = [
          'Request login details via email/dashboard',
          'Verify CMS login credentials work',
          'Retrieve hosting control panel access',
          'Backup website before implementing edits'
        ];
      } else if (!isIndexable) {
        // Scenario B: Has site, not indexable
        newState = 'BUILD';
        taskTitle = 'Fix website indexing issues and robots.txt configuration';
        taskDesc = `Client website is flagged as non-indexable.\n\nWe need to check robots.txt, meta robots tags, sitemap entries, and verify Google Search Console setup.`;
        taskPriority = 'CRITICAL';
        subtasksList = [
          'Inspect meta robots tags for noindex',
          'Verify robots.txt allows crawler access',
          'Submit sitemap to Google Search Console',
          'Verify domain name resolves correctly'
        ];
      } else {
        // Scenario E: Has site, indexable, has CMS access
        newState = 'GROWTH';
        taskTitle = 'Perform landing page SEO optimization audit & schema integration';
        taskDesc = `Client has an indexable website with CMS access.\n\nAudit page tags, map local keyword targets, inject LocalBusiness JSON-LD schema headers, and establish search metrics.`;
        taskPriority = 'MEDIUM';
        subtasksList = [
          'Perform target keyword ranking audit',
          'Inject LocalBusiness JSON-LD schema markup',
          'Configure UTM campaign link tracking',
          'Verify title tag and meta descriptions'
        ];
      }
    } else {
      if (wantsSite) {
        // Scenario C: No site, wants one
        newState = 'BUILD';
        taskTitle = 'Draft location page template & design mockup for new website';
        taskDesc = `Client has no website and wants one built.\n\nWe will design a high-converting local landing page wireframe, compile content blocks, and submit for client approval.`;
        taskPriority = 'HIGH';
        subtasksList = [
          'Select website styling theme & layout',
          'Draft landing page copywriting copy blocks',
          'Assemble location maps embed & schema details',
          'Design wireframe layout mockups'
        ];
      } else {
        // Scenario D: No site, doesn't want one
        newState = 'GROWTH';
        taskTitle = 'Configure off-site Google Business Profile primary content and citations';
        taskDesc = `Client has no website and does not want one.\n\nOnboarding focus will reside entirely on optimizing their Google Business Profile details, FAQs, posts, and citation networks.`;
        taskPriority = 'MEDIUM';
        subtasksList = [
          'Optimize GBP business details and description',
          'Populate primary services list and products',
          'Build foundational citation platform profiles',
          'Establish weekly post schedule'
        ];
      }
    }

    // Create the appropriate M2 Task and its subtasks
    const task = await db.task.create({
      data: {
        clientId: id,
        taskId: 'REQ-M2-01',
        title: taskTitle,
        description: taskDesc,
        priority: taskPriority,
        module: 'M2',
        status: 'NOT_STARTED',
        subtasks: {
          create: subtasksList.map((title, index) => ({
            title,
            sortOrder: index + 1
          }))
        }
      }
    });

    // Update client lifecycleState
    const updatedClient = await db.client.update({
      where: { id },
      data: { lifecycleState: newState }
    });

    // Create change log entry
    await db.changeLogEntry.create({
      data: {
        clientId: id,
        module: "M2",
        entityType: "Client",
        entityId: id,
        field: "lifecycleState",
        oldValue: client.lifecycleState,
        newValue: newState,
        changedById: auth.user.id,
      }
    });

    return NextResponse.json({
      client: updatedClient,
      task
    });
  } catch (error) {
    console.error("Onboarding wizard API error:", error);
    return NextResponse.json(
      { error: "Failed to process onboarding wizard" },
      { status: 500 }
    );
  }
}
