import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const DEMO = {
  firmSlug: 'demo-taiwo-co',
  firmName: 'Taiwo & Co Demo',
  password: 'DemoPass123!',
  users: {
    managingPartner: 'mp.demo@taiwoandco.com',
    reviewer: 'reviewer.demo@taiwoandco.com',
    valuer: 'valuer.demo@taiwoandco.com',
    finance: 'finance.demo@taiwoandco.com',
    fieldOfficer: 'field.demo@taiwoandco.com',
  },
}

function rid(prefix) {
  return `${prefix}-${crypto.randomUUID()}`
}

function templateItems(lines) {
  return lines.map((text) => ({
    id: crypto.randomUUID(),
    text,
  }))
}

function htmlReport({ title, reference, clientName, concludedValue, note, status }) {
  return `
  <article style="font-family: Inter, Arial, sans-serif; color: #0f172a; line-height: 1.6; padding: 18px 6px;">
    <header style="display:flex;justify-content:space-between;gap:24px;border-bottom:1px solid #dbe7df;padding-bottom:18px;margin-bottom:22px;">
      <div>
        <div style="font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:#6f8791;font-weight:700;">Valuation Report</div>
        <h1 style="font-size:30px;line-height:1.1;margin:8px 0 4px;">${title}</h1>
        <p style="margin:0;color:#47606b;">${reference} · ${clientName}</p>
      </div>
      <div style="border:1px solid #dbe7df;border-radius:18px;padding:14px 16px;background:#f7fbf8;min-width:220px;">
        <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#6f8791;font-weight:700;">Status</div>
        <div style="font-weight:700;margin-top:8px;">${status}</div>
        <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#6f8791;font-weight:700;margin-top:14px;">Opinion Of Value</div>
        <div style="font-size:26px;font-weight:800;margin-top:8px;">${concludedValue}</div>
      </div>
    </header>
    <section style="border:1px solid #dbe7df;border-radius:20px;padding:18px 20px;background:#fff;">
      <div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#6f8791;font-weight:700;">Reconciliation Note</div>
      <p style="margin:10px 0 0;">${note}</p>
    </section>
  </article>`
}

async function deleteExistingDemoFirm() {
  const firm = await prisma.firm.findUnique({
    where: { slug: DEMO.firmSlug },
    select: {
      id: true,
      clients: { select: { id: true } },
      cases: { select: { id: true } },
    },
  })

  if (!firm) return

  const caseIds = firm.cases.map((item) => item.id)
  const clientIds = firm.clients.map((item) => item.id)
  const reportIds = caseIds.length
    ? (
        await prisma.report.findMany({
          where: { caseId: { in: caseIds } },
          select: { id: true },
        })
      ).map((item) => item.id)
    : []
  const inspectionIds = caseIds.length
    ? (
        await prisma.inspection.findMany({
          where: { caseId: { in: caseIds } },
          select: { id: true },
        })
      ).map((item) => item.id)
    : []

  await prisma.reviewComment.deleteMany({ where: { firmId: firm.id } })
  await prisma.notification.deleteMany({ where: { firmId: firm.id } })
  await prisma.auditLog.deleteMany({ where: { firmId: firm.id } })
  await prisma.document.deleteMany({ where: { firmId: firm.id } })
  await prisma.invoice.deleteMany({ where: { firmId: firm.id } })
  await prisma.report.deleteMany({ where: { firmId: firm.id } })
  await prisma.reportTemplate.deleteMany({ where: { firmId: firm.id } })
  await prisma.comparableImportJob.deleteMany({ where: { firmId: firm.id } })
  await prisma.valuationAnalysis.deleteMany({ where: { firmId: firm.id } })

  if (inspectionIds.length) {
    await prisma.inspectionMedia.deleteMany({ where: { inspectionId: { in: inspectionIds } } })
  }
  await prisma.inspection.deleteMany({ where: { firmId: firm.id } })

  if (caseIds.length) {
    await prisma.caseComparable.deleteMany({ where: { caseId: { in: caseIds } } })
    await prisma.caseChecklistItem.deleteMany({ where: { caseId: { in: caseIds } } })
  }

  await prisma.case.deleteMany({ where: { firmId: firm.id } })

  if (clientIds.length) {
    await prisma.contact.deleteMany({ where: { clientId: { in: clientIds } } })
  }

  await prisma.client.deleteMany({ where: { firmId: firm.id } })
  await prisma.comparable.deleteMany({ where: { firmId: firm.id } })
  await prisma.property.deleteMany({ where: { firmId: firm.id } })
  await prisma.user.deleteMany({ where: { firmId: firm.id } })
  await prisma.branch.deleteMany({ where: { firmId: firm.id } })
  await prisma.firm.delete({ where: { id: firm.id } })
}

async function main() {
  await deleteExistingDemoFirm()

  const passwordHash = await bcrypt.hash(DEMO.password, 10)
  const now = new Date()
  const oneDay = 24 * 60 * 60 * 1000

  const firm = await prisma.firm.create({
    data: {
      name: DEMO.firmName,
      slug: DEMO.firmSlug,
      rcNumber: 'RC-DEMO-102938',
      esvarNumber: 'ESVAR-DEMO-22',
      address: '12 Admiralty Way',
      city: 'Lagos',
      state: 'Lagos',
      phone: '+234 800 111 2233',
      email: 'hello@demo.taiwoandco.com',
    },
  })

  const [lekkiBranch, abujaBranch] = await Promise.all([
    prisma.branch.create({
      data: {
        firmId: firm.id,
        name: 'Lekki Branch',
        address: '23 Wharf Road',
        city: 'Lagos',
        state: 'Lagos',
        phone: '+234 800 333 4455',
      },
    }),
    prisma.branch.create({
      data: {
        firmId: firm.id,
        name: 'Abuja Branch',
        address: '41 Adetokunbo Ademola Crescent',
        city: 'Abuja',
        state: 'FCT',
        phone: '+234 800 555 6677',
      },
    }),
  ])

  const managingPartner = await prisma.user.create({
    data: {
      firmId: firm.id,
      email: DEMO.users.managingPartner,
      passwordHash,
      firstName: 'Michael',
      lastName: 'Adeleye',
      phone: '+234 803 000 1001',
      role: 'managing_partner',
      lastLoginAt: now,
    },
  })

  const reviewer = await prisma.user.create({
    data: {
      firmId: firm.id,
      branchId: lekkiBranch.id,
      email: DEMO.users.reviewer,
      passwordHash,
      firstName: 'Amina',
      lastName: 'Bello',
      phone: '+234 803 000 1002',
      role: 'reviewer',
      lastLoginAt: now,
      invitedById: managingPartner.id,
    },
  })

  const valuer = await prisma.user.create({
    data: {
      firmId: firm.id,
      branchId: lekkiBranch.id,
      email: DEMO.users.valuer,
      passwordHash,
      firstName: 'Tolu',
      lastName: 'Akin',
      phone: '+234 803 000 1003',
      role: 'valuer',
      lastLoginAt: now,
      invitedById: managingPartner.id,
    },
  })

  const finance = await prisma.user.create({
    data: {
      firmId: firm.id,
      branchId: abujaBranch.id,
      email: DEMO.users.finance,
      passwordHash,
      firstName: 'Bisi',
      lastName: 'Ojo',
      phone: '+234 803 000 1004',
      role: 'finance',
      lastLoginAt: now,
      invitedById: managingPartner.id,
    },
  })

  const fieldOfficer = await prisma.user.create({
    data: {
      firmId: firm.id,
      branchId: lekkiBranch.id,
      email: DEMO.users.fieldOfficer,
      passwordHash,
      firstName: 'Kehinde',
      lastName: 'Lawal',
      phone: '+234 803 000 1005',
      role: 'field_officer',
      lastLoginAt: now,
      invitedById: managingPartner.id,
    },
  })

  const activeTemplate = await prisma.reportTemplate.create({
    data: {
      firmId: firm.id,
      name: 'Prime Market Template',
      valuationType: 'market',
      templateHtml: '',
      defaultAssumptions: templateItems([
        'Property title supplied by the client is assumed to be valid and marketable.',
        'No latent structural defects were disclosed beyond what was visible at inspection.',
      ]),
      defaultDisclaimers: templateItems([
        'This report is for the stated valuation purpose only.',
        'No third-party reliance is permitted without written consent.',
      ]),
      isActive: true,
      createdById: managingPartner.id,
    },
  })

  const clients = await Promise.all([
    prisma.client.create({
      data: {
        firmId: firm.id,
        branchId: lekkiBranch.id,
        type: 'corporate',
        name: 'Paradigm Shift Multimedia',
        email: 'ops@paradigmshiftmedia.com',
        phone: '+234 746 639 2144',
        address: '23 Wharf Road',
        city: 'Lagos',
        state: 'Lagos',
        rcNumber: 'RC-558811',
        notes: '<p>Priority recurring client with quick decision cycles and clean document turnaround.</p>',
        tags: ['priority', 'repeat-client'],
        createdById: managingPartner.id,
        contacts: {
          create: [
            {
              name: 'Michael Olusegun Adeleye',
              email: 'joko.adeleye@gmail.com',
              phone: '07466392144',
              role: 'Director',
              isPrimary: true,
            },
          ],
        },
      },
    }),
    prisma.client.create({
      data: {
        firmId: firm.id,
        branchId: abujaBranch.id,
        type: 'corporate',
        name: 'Royal Crest Holdings',
        email: 'facilities@royalcrest.ng',
        phone: '+234 802 440 1919',
        address: '17 Gana Street',
        city: 'Abuja',
        state: 'FCT',
        rcNumber: 'RC-774422',
        notes: '<p>Investment-focused client with regular review and portfolio valuation requests.</p>',
        tags: ['corporate', 'investment'],
        createdById: managingPartner.id,
        contacts: {
          create: [
            {
              name: 'Bamidele Yusuf',
              email: 'bamidele@royalcrest.ng',
              phone: '+234 802 440 1920',
              role: 'Head of Facilities',
              isPrimary: true,
            },
          ],
        },
      },
    }),
    prisma.client.create({
      data: {
        firmId: firm.id,
        branchId: lekkiBranch.id,
        type: 'corporate',
        name: 'Sterling Warehouses Limited',
        email: 'estate@sterlingwarehouses.ng',
        phone: '+234 809 700 0001',
        address: '4A Acme Road',
        city: 'Lagos',
        state: 'Lagos',
        rcNumber: 'RC-661177',
        notes: '<p>Operational warehousing account. Useful for inspection and mobile testing.</p>',
        tags: ['industrial'],
        createdById: managingPartner.id,
        contacts: {
          create: [
            {
              name: 'Chisom Nwankwo',
              email: 'chisom@sterlingwarehouses.ng',
              phone: '+234 809 700 0002',
              role: 'Operations Manager',
              isPrimary: true,
            },
          ],
        },
      },
    }),
  ])

  const [paradigmClient, royalCrestClient, sterlingClient] = clients

  const properties = await Promise.all([
    prisma.property.create({
      data: {
        firmId: firm.id,
        clientId: paradigmClient.id,
        address: '23 Wharf Road, Lekki Phase 1',
        city: 'Lagos',
        state: 'Lagos',
        localGovernment: 'Eti-Osa',
        propertyUse: 'commercial',
        tenureType: 'leasehold',
        plotSize: '1250',
        plotSizeUnit: 'sqm',
        description:
          '<p>A mid-rise office property with supporting parking and good frontage within the Lekki commercial corridor.</p>',
        createdById: managingPartner.id,
      },
    }),
    prisma.property.create({
      data: {
        firmId: firm.id,
        clientId: royalCrestClient.id,
        address: '17 Gana Street, Maitama',
        city: 'Abuja',
        state: 'FCT',
        localGovernment: 'AMAC',
        propertyUse: 'mixed_use',
        tenureType: 'freehold',
        plotSize: '980',
        plotSizeUnit: 'sqm',
        description:
          '<p>A mixed-use investment property with office suites above retail frontage and steady cash flow.</p>',
        createdById: managingPartner.id,
      },
    }),
    prisma.property.create({
      data: {
        firmId: firm.id,
        clientId: sterlingClient.id,
        address: '4A Acme Road, Ogba',
        city: 'Lagos',
        state: 'Lagos',
        localGovernment: 'Ikeja',
        propertyUse: 'industrial',
        tenureType: 'leasehold',
        plotSize: '3400',
        plotSizeUnit: 'sqm',
        description:
          '<p>Industrial warehouse with yard circulation, loading access, and support office accommodation.</p>',
        createdById: managingPartner.id,
      },
    }),
    prisma.property.create({
      data: {
        firmId: firm.id,
        address: '12 Ozumba Mbadiwe Avenue',
        city: 'Lagos',
        state: 'Lagos',
        localGovernment: 'Eti-Osa',
        propertyUse: 'commercial',
        tenureType: 'leasehold',
        plotSize: '1450',
        plotSizeUnit: 'sqm',
        description:
          '<p>Prime office asset positioned for lender valuation and report generation testing.</p>',
        createdById: managingPartner.id,
      },
    }),
  ])

  const [paradigmProperty, royalCrestProperty, sterlingProperty, marinaProperty] = properties

  const comparables = await Promise.all([
    prisma.comparable.create({
      data: {
        firmId: firm.id,
        comparableType: 'sales',
        address: '15 Admiralty Way',
        city: 'Lagos',
        state: 'Lagos',
        propertyUse: 'commercial',
        tenureType: 'leasehold',
        transactionDate: new Date(now.getTime() - 45 * oneDay),
        salePrice: '260000000',
        plotSize: '1200',
        plotSizeUnit: 'sqm',
        buildingSize: '1100',
        buildingSizeUnit: 'sqm',
        pricePerSqm: '208000',
        source: 'Registered transaction',
        sourceContact: 'Lekki broker network',
        notes: '<p>Strong location match and verified transaction evidence.</p>',
        isVerified: true,
        addedById: managingPartner.id,
      },
    }),
    prisma.comparable.create({
      data: {
        firmId: firm.id,
        comparableType: 'sales',
        address: '7 Freedom Way',
        city: 'Lagos',
        state: 'Lagos',
        propertyUse: 'commercial',
        tenureType: 'leasehold',
        transactionDate: new Date(now.getTime() - 70 * oneDay),
        salePrice: '248000000',
        plotSize: '1180',
        plotSizeUnit: 'sqm',
        buildingSize: '1080',
        buildingSizeUnit: 'sqm',
        pricePerSqm: '198000',
        source: 'Broker verification',
        sourceContact: 'Akin & Co',
        notes: '<p>Slightly weaker frontage than the subject asset.</p>',
        isVerified: true,
        addedById: reviewer.id,
      },
    }),
    prisma.comparable.create({
      data: {
        firmId: firm.id,
        comparableType: 'rental',
        address: '3A Fola Osibo Road',
        city: 'Lagos',
        state: 'Lagos',
        propertyUse: 'commercial',
        tenureType: 'leasehold',
        transactionDate: new Date(now.getTime() - 95 * oneDay),
        rentalValue: '36000000',
        plotSize: '1300',
        plotSizeUnit: 'sqm',
        buildingSize: '1150',
        buildingSizeUnit: 'sqm',
        pricePerSqm: '195000',
        source: 'Tenant schedule',
        sourceContact: 'Property manager',
        notes: '<p>Rental evidence used to frame yield expectations.</p>',
        isVerified: false,
        addedById: valuer.id,
      },
    }),
    prisma.comparable.create({
      data: {
        firmId: firm.id,
        comparableType: 'sales',
        address: '24 Aguiyi Ironsi Street',
        city: 'Abuja',
        state: 'FCT',
        propertyUse: 'mixed_use',
        tenureType: 'freehold',
        transactionDate: new Date(now.getTime() - 40 * oneDay),
        salePrice: '310000000',
        plotSize: '990',
        plotSizeUnit: 'sqm',
        buildingSize: '920',
        buildingSizeUnit: 'sqm',
        pricePerSqm: '313000',
        source: 'Land registry cross-check',
        sourceContact: 'Abuja valuations desk',
        notes: '<p>Useful for the Abuja portfolio case.</p>',
        isVerified: true,
        addedById: managingPartner.id,
      },
    }),
    prisma.comparable.create({
      data: {
        firmId: firm.id,
        comparableType: 'land',
        address: '5 Warehouse Crescent',
        city: 'Lagos',
        state: 'Lagos',
        propertyUse: 'industrial',
        tenureType: 'leasehold',
        transactionDate: new Date(now.getTime() - 55 * oneDay),
        salePrice: '185000000',
        plotSize: '3600',
        plotSizeUnit: 'sqm',
        pricePerSqm: '51400',
        source: 'Industrial market desk',
        sourceContact: 'Ogba transaction log',
        notes: '<p>Useful baseline for warehouse and industrial yard comparisons.</p>',
        isVerified: true,
        addedById: valuer.id,
      },
    }),
  ])

  const [compAdm, compFreedom, compFola, compAguiyi, compWarehouse] = comparables

  await prisma.comparableImportJob.createMany({
    data: [
      {
        firmId: firm.id,
        fileKey: 'demo/imports/comparables-batch-01.csv',
        status: 'complete',
        importedCount: 8,
        failedCount: 0,
        errors: [],
        createdById: managingPartner.id,
      },
      {
        firmId: firm.id,
        fileKey: 'demo/imports/comparables-batch-02.csv',
        status: 'partial_failure',
        importedCount: 3,
        failedCount: 2,
        errors: [
          { row: 4, error: 'Missing address' },
          { row: 6, error: 'Invalid transaction date' },
        ],
        createdById: reviewer.id,
      },
    ],
  })

  const caseReview = await prisma.case.create({
    data: {
      firmId: firm.id,
      branchId: lekkiBranch.id,
      reference: 'DMO-2603-1001',
      clientId: paradigmClient.id,
      propertyId: paradigmProperty.id,
      valuationType: 'market',
      valuationPurpose: 'Secured lending review',
      assignedValuerId: valuer.id,
      assignedReviewerId: reviewer.id,
      stage: 'review',
      dueDate: new Date(now.getTime() + 3 * oneDay),
      feeAmount: '450000',
      feeCurrency: 'NGN',
      isOverdue: false,
      internalNotes: 'Priority lender instruction currently with reviewer.',
      createdById: managingPartner.id,
    },
  })

  const caseFinal = await prisma.case.create({
    data: {
      firmId: firm.id,
      branchId: abujaBranch.id,
      reference: 'DMO-2603-1002',
      clientId: royalCrestClient.id,
      propertyId: royalCrestProperty.id,
      valuationType: 'market',
      valuationPurpose: 'Portfolio monitoring',
      assignedValuerId: valuer.id,
      assignedReviewerId: reviewer.id,
      stage: 'payment_received',
      dueDate: new Date(now.getTime() - 2 * oneDay),
      feeAmount: '525000',
      feeCurrency: 'NGN',
      isOverdue: false,
      internalNotes: 'Final report issued and invoice settled.',
      createdById: managingPartner.id,
    },
  })

  const caseInspection = await prisma.case.create({
    data: {
      firmId: firm.id,
      branchId: lekkiBranch.id,
      reference: 'DMO-2603-1003',
      clientId: sterlingClient.id,
      propertyId: sterlingProperty.id,
      valuationType: 'market',
      valuationPurpose: 'Operational inspection field run',
      assignedValuerId: valuer.id,
      assignedReviewerId: reviewer.id,
      stage: 'inspection_scheduled',
      dueDate: new Date(now.getTime() + 5 * oneDay),
      feeAmount: '380000',
      feeCurrency: 'NGN',
      isOverdue: false,
      internalNotes: 'Keep this case in draft inspection state for mobile testing.',
      createdById: managingPartner.id,
    },
  })

  const caseReady = await prisma.case.create({
    data: {
      firmId: firm.id,
      branchId: lekkiBranch.id,
      reference: 'DMO-2603-1004',
      clientId: paradigmClient.id,
      propertyId: marinaProperty.id,
      valuationType: 'market',
      valuationPurpose: 'Mortgage valuation draft generation demo',
      assignedValuerId: valuer.id,
      assignedReviewerId: reviewer.id,
      stage: 'comparable_analysis',
      dueDate: new Date(now.getTime() + 2 * oneDay),
      feeAmount: '490000',
      feeCurrency: 'NGN',
      isOverdue: false,
      internalNotes: 'Ready to test Generate New Version from the reports tab.',
      createdById: managingPartner.id,
    },
  })

  await prisma.caseChecklistItem.createMany({
    data: [
      { caseId: caseInspection.id, label: 'Confirm gate access with site team', isChecked: true, checkedById: fieldOfficer.id, checkedAt: new Date(now.getTime() - oneDay) },
      { caseId: caseInspection.id, label: 'Capture warehouse yard photographs', isChecked: false },
      { caseId: caseInspection.id, label: 'Verify occupancy and current use', isChecked: false },
    ],
  })

  const submittedInspectionReview = await prisma.inspection.create({
    data: {
      caseId: caseReview.id,
      firmId: firm.id,
      inspectedById: fieldOfficer.id,
      status: 'submitted',
      inspectionDate: new Date(now.getTime() - 4 * oneDay),
      externalCondition: 'good',
      internalCondition: 'good',
      services: 'fully_serviced',
      conditionSummary: '<p>Condition is generally good with only minor maintenance observations.</p>',
      locationDescription: '<p>Located within a strong office and retail catchment with reliable access and visibility.</p>',
      occupancy: 'Owner occupied',
      notes: '<p>Parking, frontage, and access all support the upper end of the evidence range.</p>',
      submittedAt: new Date(now.getTime() - 3 * oneDay),
    },
  })

  const submittedInspectionFinal = await prisma.inspection.create({
    data: {
      caseId: caseFinal.id,
      firmId: firm.id,
      inspectedById: fieldOfficer.id,
      status: 'submitted',
      inspectionDate: new Date(now.getTime() - 12 * oneDay),
      externalCondition: 'good',
      internalCondition: 'good',
      services: 'fully_serviced',
      conditionSummary: '<p>The property presents well and remains suitable for continued investment holding.</p>',
      locationDescription: '<p>Established mixed-use district with strong occupancy and resilient tenant demand.</p>',
      occupancy: 'Fully let',
      notes: '<p>No obvious physical defects were observed during inspection.</p>',
      submittedAt: new Date(now.getTime() - 11 * oneDay),
    },
  })

  const draftInspection = await prisma.inspection.create({
    data: {
      caseId: caseInspection.id,
      firmId: firm.id,
      inspectedById: fieldOfficer.id,
      status: 'draft',
      inspectionDate: new Date(now.getTime() + oneDay),
      occupancy: 'Partially occupied',
      locationDescription: '<p>Industrial corridor with active loading traffic and good yard access.</p>',
      notes: '<p>Draft inspection created for mobile testing. Add photos and submit from the app.</p>',
    },
  })

  const submittedInspectionReady = await prisma.inspection.create({
    data: {
      caseId: caseReady.id,
      firmId: firm.id,
      inspectedById: fieldOfficer.id,
      status: 'submitted',
      inspectionDate: new Date(now.getTime() - 2 * oneDay),
      externalCondition: 'good',
      internalCondition: 'good',
      services: 'fully_serviced',
      conditionSummary: '<p>Prime office accommodation with strong frontage and above-average fit-out quality.</p>',
      locationDescription: '<p>Prime corridor location supporting lender security and marketability.</p>',
      occupancy: 'Owner occupied',
      notes: '<p>Inspection is complete and ready for report generation testing.</p>',
      submittedAt: new Date(now.getTime() - oneDay),
    },
  })

  await prisma.inspectionMedia.createMany({
    data: [
      { inspectionId: submittedInspectionReview.id, s3Key: 'demo/inspections/review/front-elevation.jpg', caption: 'Front elevation', sortOrder: 1 },
      { inspectionId: submittedInspectionReview.id, s3Key: 'demo/inspections/review/lobby.jpg', caption: 'Lobby and reception', sortOrder: 2 },
      { inspectionId: submittedInspectionFinal.id, s3Key: 'demo/inspections/final/street-view.jpg', caption: 'Street approach', sortOrder: 1 },
      { inspectionId: submittedInspectionFinal.id, s3Key: 'demo/inspections/final/retail-floor.jpg', caption: 'Retail floorplate', sortOrder: 2 },
      { inspectionId: submittedInspectionReady.id, s3Key: 'demo/inspections/ready/frontage.jpg', caption: 'Prime office frontage', sortOrder: 1 },
    ],
  })

  await prisma.caseComparable.createMany({
    data: [
      { caseId: caseReview.id, comparableId: compAdm.id, weight: '45.00', relevanceScore: 5, adjustmentAmount: '-5000000', adjustmentNote: 'Inferior frontage.', addedById: valuer.id },
      { caseId: caseReview.id, comparableId: compFreedom.id, weight: '35.00', relevanceScore: 4, adjustmentAmount: '8000000', adjustmentNote: 'Subject fit-out is superior.', addedById: valuer.id },
      { caseId: caseReview.id, comparableId: compFola.id, weight: '20.00', relevanceScore: 3, adjustmentAmount: '12000000', adjustmentNote: 'Rental evidence with covenant moderation.', addedById: valuer.id },
      { caseId: caseFinal.id, comparableId: compAguiyi.id, weight: '55.00', relevanceScore: 5, adjustmentAmount: '-10000000', adjustmentNote: 'Subject has slightly weaker tenancy quality.', addedById: valuer.id },
      { caseId: caseFinal.id, comparableId: compAdm.id, weight: '20.00', relevanceScore: 3, adjustmentAmount: '5000000', adjustmentNote: 'Lagged Lagos evidence used for secondary support.', addedById: reviewer.id },
      { caseId: caseFinal.id, comparableId: compFreedom.id, weight: '25.00', relevanceScore: 4, adjustmentAmount: '3000000', adjustmentNote: 'Inferior Abuja positioning after adjustment.', addedById: reviewer.id },
      { caseId: caseReady.id, comparableId: compAdm.id, weight: '40.00', relevanceScore: 5, adjustmentAmount: '-3000000', adjustmentNote: 'Minor frontage inferiority.', addedById: valuer.id },
      { caseId: caseReady.id, comparableId: compFreedom.id, weight: '30.00', relevanceScore: 4, adjustmentAmount: '7000000', adjustmentNote: 'Subject enjoys better parking and depth.', addedById: valuer.id },
      { caseId: caseReady.id, comparableId: compFola.id, weight: '30.00', relevanceScore: 3, adjustmentAmount: '10000000', adjustmentNote: 'Rental evidence uplifted for stronger subject quality.', addedById: valuer.id },
      { caseId: caseInspection.id, comparableId: compWarehouse.id, weight: '100.00', relevanceScore: 4, adjustmentAmount: '0', adjustmentNote: 'Industrial land benchmark.', addedById: fieldOfficer.id },
    ],
  })

  await prisma.valuationAnalysis.createMany({
    data: [
      {
        caseId: caseReview.id,
        firmId: firm.id,
        method: 'sales_comparison',
        basisOfValue: 'market_value',
        assumptions: templateItems([
          'Title supplied by the client is valid and marketable.',
          'The property is free from undisclosed latent defects.',
        ]),
        specialAssumptions: templateItems([
          'Current occupation profile remains materially unchanged through completion.',
        ]),
        comparableGrid: {
          summary: {
            weightedAdjustedIndication: 265000000,
            weightedAverageRate: 212000,
            averageRelevance: 4.2,
          },
        },
        commentary:
          '<p>The concluded value is modestly above the weighted evidence because the subject enjoys stronger frontage, better parking, and more reliable covenant quality.</p>',
        concludedValue: '270000000',
        valuationDate: new Date(now.getTime() - oneDay),
        status: 'complete',
        createdById: valuer.id,
      },
      {
        caseId: caseFinal.id,
        firmId: firm.id,
        method: 'sales_comparison',
        basisOfValue: 'market_value',
        assumptions: templateItems([
          'The tenancy information provided by management is substantially correct.',
        ]),
        specialAssumptions: templateItems([]),
        comparableGrid: {
          summary: {
            weightedAdjustedIndication: 308000000,
            weightedAverageRate: 300000,
            averageRelevance: 4.0,
          },
        },
        commentary:
          '<p>The adopted value reflects stronger investment quality and covenant resilience than the lower-ranked support evidence.</p>',
        concludedValue: '315000000',
        valuationDate: new Date(now.getTime() - 8 * oneDay),
        status: 'complete',
        createdById: valuer.id,
      },
      {
        caseId: caseReady.id,
        firmId: firm.id,
        method: 'sales_comparison',
        basisOfValue: 'market_value',
        assumptions: templateItems([
          'No material planning restriction affects current use.',
        ]),
        specialAssumptions: templateItems([
          'All critical services remain operational at the valuation date.',
        ]),
        comparableGrid: {
          summary: {
            weightedAdjustedIndication: 272000000,
            weightedAverageRate: 214500,
            averageRelevance: 4.0,
          },
        },
        commentary:
          '<p>The concluded value should remain close to the weighted indication because the attached evidence is tightly clustered and directly comparable.</p>',
        concludedValue: '275000000',
        valuationDate: new Date(now.getTime()),
        status: 'complete',
        createdById: valuer.id,
      },
    ],
  })

  const reviewReport = await prisma.report.create({
    data: {
      caseId: caseReview.id,
      firmId: firm.id,
      templateId: activeTemplate.id,
      status: 'submitted_for_review',
      version: 1,
      renderedHtml: htmlReport({
        title: 'Market Value Review Draft',
        reference: caseReview.reference,
        clientName: paradigmClient.name,
        concludedValue: 'NGN 270,000,000',
        note: 'Reviewer attention is required on one remaining blocking comment before approval.',
        status: 'Under Review',
      }),
      generatedAt: new Date(now.getTime() - oneDay),
      createdById: valuer.id,
    },
  })

  const finalReport = await prisma.report.create({
    data: {
      caseId: caseFinal.id,
      firmId: firm.id,
      templateId: activeTemplate.id,
      status: 'final',
      version: 2,
      renderedHtml: htmlReport({
        title: 'Final Investment Monitoring Report',
        reference: caseFinal.reference,
        clientName: royalCrestClient.name,
        concludedValue: 'NGN 315,000,000',
        note: 'This final version was approved and issued after reviewer sign-off.',
        status: 'Final',
      }),
      generatedAt: new Date(now.getTime() - 6 * oneDay),
      approvedById: reviewer.id,
      approvedAt: new Date(now.getTime() - 6 * oneDay),
      createdById: valuer.id,
    },
  })

  await prisma.reviewComment.createMany({
    data: [
      {
        reportId: reviewReport.id,
        firmId: firm.id,
        authorId: reviewer.id,
        type: 'blocking',
        body: 'Clarify why the concluded value exceeds the weighted indication despite the secondary evidence being weaker.',
        isResolved: false,
      },
      {
        reportId: reviewReport.id,
        firmId: firm.id,
        authorId: reviewer.id,
        type: 'suggestion',
        body: 'Include a shorter statement on frontage and parking advantage in the executive summary.',
        isResolved: true,
        resolvedById: valuer.id,
        resolvedAt: new Date(now.getTime() - 10 * 60 * 60 * 1000),
      },
    ],
  })

  await prisma.invoice.create({
    data: {
      caseId: caseFinal.id,
      firmId: firm.id,
      clientId: royalCrestClient.id,
      invoiceNumber: 'DMO-INV-2603-2001',
      status: 'paid',
      amount: '450000',
      currency: 'NGN',
      taxRate: '0.1500',
      taxAmount: '67500',
      totalAmount: '517500',
      dueDate: new Date(now.getTime() - 8 * oneDay),
      paidAt: new Date(now.getTime() - 5 * oneDay),
      notes: 'Demo invoice fully paid for the final report workflow.',
      createdById: finance.id,
    },
  })

  await prisma.notification.createMany({
    data: [
      {
        firmId: firm.id,
        userId: reviewer.id,
        type: 'review_requested',
        title: 'Review requested for demo case',
        body: `${caseReview.reference} is waiting on your sign-off.`,
        entityType: 'Report',
        entityId: reviewReport.id,
      },
      {
        firmId: firm.id,
        userId: valuer.id,
        type: 'case_assigned',
        title: 'Inspection-ready demo case assigned',
        body: `${caseInspection.reference} is ready for field completion on mobile.`,
        entityType: 'Case',
        entityId: caseInspection.id,
      },
      {
        firmId: firm.id,
        userId: managingPartner.id,
        type: 'payment_received',
        title: 'Demo invoice paid',
        body: `${caseFinal.reference} payment has been recorded.`,
        entityType: 'Invoice',
        entityId: caseFinal.id,
      },
    ],
  })

  await prisma.auditLog.createMany({
    data: [
      {
        firmId: firm.id,
        userId: valuer.id,
        action: 'CONCLUDED_VALUE_CHANGED',
        entityType: 'ValuationAnalysis',
        entityId: caseReview.id,
        before: { concludedValue: '265000000' },
        after: { concludedValue: '270000000' },
      },
      {
        firmId: firm.id,
        userId: reviewer.id,
        action: 'REPORT_APPROVED',
        entityType: 'Report',
        entityId: finalReport.id,
        before: { status: 'submitted_for_review' },
        after: { status: 'approved' },
      },
    ],
  })

  console.log('')
  console.log('Demo seed complete.')
  console.log(`Firm: ${DEMO.firmName}`)
  console.log('Login credentials:')
  console.log(`- Managing Partner: ${DEMO.users.managingPartner} / ${DEMO.password}`)
  console.log(`- Reviewer: ${DEMO.users.reviewer} / ${DEMO.password}`)
  console.log(`- Valuer: ${DEMO.users.valuer} / ${DEMO.password}`)
  console.log(`- Finance: ${DEMO.users.finance} / ${DEMO.password}`)
  console.log(`- Field Officer: ${DEMO.users.fieldOfficer} / ${DEMO.password}`)
  console.log('')
  console.log('Seeded highlights:')
  console.log(`- Review report case: ${caseReview.reference}`)
  console.log(`- Final report case: ${caseFinal.reference}`)
  console.log(`- Mobile draft inspection case: ${caseInspection.reference}`)
  console.log(`- Ready-to-generate report case: ${caseReady.reference}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
