import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/db.js';
import {
  Pod,
  Employee,
  Brand,
  Process,
  Assignment,
  Holiday,
  Leave,
  Roster,
  RosterEntry,
  CompOffLedger,
  AuditLog,
} from '../models/index.js';
import { generateRoster } from '../engine/scheduler.js';

export async function runSeed(exitWhenDone = true) {
  try {
    console.log('[Seed] Starting database seeding...');
    await connectDB();

    // Clear existing collections
    console.log('[Seed] Clearing existing collections...');
    await Promise.all([
      Pod.deleteMany({}),
      Employee.deleteMany({}),
      Brand.deleteMany({}),
      Process.deleteMany({}),
      Assignment.deleteMany({}),
      Holiday.deleteMany({}),
      Leave.deleteMany({}),
      Roster.deleteMany({}),
      RosterEntry.deleteMany({}),
      CompOffLedger.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);

    const passwordHash = await bcrypt.hash('password123', 10);

    // 1. Create Pods
    console.log('[Seed] Creating 6 Pods...');
    const podNames = [
      'Pod Alpha (Quick Commerce)',
      'Pod Beta (Fashion & Apparel)',
      'Pod Gamma (Consumer Electronics)',
      'Pod Delta (Beauty & Personal Care)',
      'Pod Epsilon (Home & Living)',
      'Pod Zeta (Health & Nutrition)',
    ];

    const pods = await Pod.insertMany(podNames.map(name => ({ name })));

    // 2. Create 36 Employees
    console.log('[Seed] Creating 36 Employees with roles, pods, and preferences...');
    const employeeData = [];

    // 1 Operations Manager
    employeeData.push({
      name: 'Aditya Manager',
      email: 'manager@ops.com',
      password: passwordHash,
      role: 'manager' as const,
      podId: pods[0]._id,
      active: true,
      preferences: { preferredWeeklyOffs: [0], avoidDays: [] },
      maxConsecutiveWorkDays: 6,
      weeklyOffsPerWeek: 1,
    });

    // 6 Pod Leads
    const leadNames = [
      'Vikram Malhotra',
      'Ananya Sen',
      'Rahul Kapoor',
      'Pooja Nair',
      'Deepak Joshi',
      'Meera Iyer',
    ];

    for (let i = 0; i < 6; i++) {
      employeeData.push({
        name: leadNames[i],
        email: `lead.pod${i + 1}@ops.com`,
        password: passwordHash,
        role: 'pod_lead' as const,
        podId: pods[i]._id,
        active: true,
        preferences: { preferredWeeklyOffs: [0], avoidDays: [1] },
        maxConsecutiveWorkDays: 6,
        weeklyOffsPerWeek: 1,
      });
    }

    // 29 Ops Agents distributed across the 6 pods
    const agentNames = [
      'Riya Sharma',      // Index 7 -> Zing sole resource demo agent
      'Aman Verma',       // Index 8
      'Sneha Roy',        // Index 9
      'Karan Patel',      // Index 10
      'Neha Gupta',       // Index 11
      'Arjun Das',        // Index 12
      'Tanvi Mehta',      // Index 13
      'Rohan Kulkarni',   // Index 14
      'Ishita Bansal',    // Index 15
      'Gaurav Rao',       // Index 16
      'Simran Kaur',      // Index 17
      'Abhishek Mishra',  // Index 18
      'Divya Pillai',     // Index 19
      'Manish Tiwari',    // Index 20
      'Shreya Deshmukh',  // Index 21
      'Varun Chawla',     // Index 22
      'Ritika Sen',       // Index 23
      'Siddharth Bhat',   // Index 24
      'Priyanka Saxena',  // Index 25
      'Kunal Jain',       // Index 26
      'Anjali Nambiar',   // Index 27
      'Harsh Vardhan',    // Index 28
      'Kavya Menon',      // Index 29
      'Tarun Ghosh',      // Index 30
      'Swati Reddy',      // Index 31
      'Nikhil Pandey',    // Index 32
      'Zoya Khan',        // Index 33
      'Mayank Agrawal',   // Index 34
      'Bhavna Bajaj',     // Index 35
    ];

    for (let i = 0; i < agentNames.length; i++) {
      const podIndex = i % 6; // evenly spread
      employeeData.push({
        name: agentNames[i],
        email: `${agentNames[i].toLowerCase().replace(/\s+/g, '.')}@ops.com`,
        password: passwordHash,
        role: 'viewer' as const,
        podId: pods[podIndex]._id,
        active: true,
        preferences: {
          preferredWeeklyOffs: [i % 2 === 0 ? 0 : 6], // Alternate Sunday or Saturday preferred
          avoidDays: i % 3 === 0 ? [1] : [],
        },
        maxConsecutiveWorkDays: 6,
        weeklyOffsPerWeek: 1,
      });
    }

    const employees = await Employee.insertMany(employeeData);

    // Update Pod Leads
    for (let i = 0; i < 6; i++) {
      pods[i].leadEmployeeId = employees[i + 1]._id as any;
      await pods[i].save();
    }

    // 3. Create 25 Brands (~80% single dedicated employee, ~20% multi-resource)
    console.log('[Seed] Creating 25 D2C Brands...');
    const brandConfigs = [
      // Pod Alpha (Quick Commerce)
      { name: 'Zing Support', podId: pods[0]._id },     // Brand 0 (Single-resource demo!)
      { name: 'QuickKart', podId: pods[0]._id },        // Brand 1 (Single)
      { name: 'DailyBite', podId: pods[0]._id },        // Brand 2 (Single)
      { name: 'UrbanMart', podId: pods[0]._id },        // Brand 3 (Single)

      // Pod Beta (Fashion & Apparel)
      { name: 'Snitch Style', podId: pods[1]._id },     // Brand 4 (Multi: 2 employees)
      { name: 'Bliss Threads', podId: pods[1]._id },    // Brand 5 (Single)
      { name: 'FabLoom', podId: pods[1]._id },          // Brand 6 (Single)
      { name: 'UrbanStitch', podId: pods[1]._id },      // Brand 7 (Single)

      // Pod Gamma (Consumer Electronics)
      { name: 'Bolt Audio', podId: pods[2]._id },       // Brand 8 (Multi: 3 employees)
      { name: 'NovaTech', podId: pods[2]._id },         // Brand 9 (Single)
      { name: 'VoltGear', podId: pods[2]._id },         // Brand 10 (Single)
      { name: 'PulseGadgets', podId: pods[2]._id },     // Brand 11 (Single)

      // Pod Delta (Beauty & Personal Care)
      { name: 'GlowAura', podId: pods[3]._id },         // Brand 12 (Multi: 2 employees)
      { name: 'PurePetals', podId: pods[3]._id },       // Brand 13 (Single)
      { name: 'DermaCare', podId: pods[3]._id },        // Brand 14 (Single)
      { name: 'SilkBotanics', podId: pods[3]._id },     // Brand 15 (Single)

      // Pod Epsilon (Home & Living)
      { name: 'WoodCrafts', podId: pods[4]._id },       // Brand 16 (Multi: 2 employees)
      { name: 'ChefCraft', podId: pods[4]._id },        // Brand 17 (Single)
      { name: 'NestLiving', podId: pods[4]._id },       // Brand 18 (Single)
      { name: 'CozyHaven', podId: pods[4]._id },        // Brand 19 (Single)

      // Pod Zeta (Health & Nutrition)
      { name: 'FitFuel', podId: pods[5]._id },          // Brand 20 (Multi: 2 employees)
      { name: 'GreenRoot', podId: pods[5]._id },        // Brand 21 (Single)
      { name: 'VitaHealth', podId: pods[5]._id },       // Brand 22 (Single)
      { name: 'NutriLife', podId: pods[5]._id },        // Brand 23 (Single)
      { name: 'ZenSupplements', podId: pods[5]._id },   // Brand 24 (Single)
    ];

    const brands = await Brand.insertMany(brandConfigs);

    // 4. Create Processes with calendar modes and minimum staff rules
    console.log('[Seed] Creating Processes with operating calendar modes...');
    const processData = [];

    // Brand 0: Zing Support (Demo single-resource brand!)
    // NDR: ALL_365, minStaff: 1
    // CS: ALL_365, minStaff: 1
    processData.push({
      brandId: brands[0]._id,
      name: 'NDR Escalations',
      type: 'NDR' as const,
      calendarMode: 'ALL_365' as const,
      minStaffDefault: 1,
    });
    processData.push({
      brandId: brands[0]._id,
      name: 'Customer Support',
      type: 'CS' as const,
      calendarMode: 'ALL_365' as const,
      minStaffDefault: 1,
    });

    // Multi-resource Brand 4: Snitch Style
    processData.push({
      brandId: brands[4]._id,
      name: 'Omnichannel CS',
      type: 'CS' as const,
      calendarMode: 'ALL_365' as const,
      minStaffDefault: 2,
    });

    // Multi-resource Brand 8: Bolt Audio
    processData.push({
      brandId: brands[8]._id,
      name: 'Tech Support',
      type: 'CS' as const,
      calendarMode: 'ALL_365' as const,
      minStaffDefault: 2,
    });
    processData.push({
      brandId: brands[8]._id,
      name: 'Warranty & Claims',
      type: 'ACC' as const,
      calendarMode: 'EXCEPT_SUN_AND_HOLIDAYS' as const,
      minStaffDefault: 1,
    });

    // Multi-resource Brand 12: GlowAura
    processData.push({
      brandId: brands[12]._id,
      name: 'Beauty Advisor Chat',
      type: 'CS' as const,
      calendarMode: 'ALL_365' as const,
      minStaffDefault: 1,
    });
    processData.push({
      brandId: brands[12]._id,
      name: 'Order Retention',
      type: 'Retention' as const,
      calendarMode: 'EXCEPT_HOLIDAYS' as const,
      minStaffDefault: 1,
    });

    // Multi-resource Brand 16: WoodCrafts
    processData.push({
      brandId: brands[16]._id,
      name: 'Custom Orders CS',
      type: 'CS' as const,
      calendarMode: 'EXCEPT_HOLIDAYS' as const,
      minStaffDefault: 1,
    });

    // Multi-resource Brand 20: FitFuel
    processData.push({
      brandId: brands[20]._id,
      name: 'Nutrition Support',
      type: 'CS' as const,
      calendarMode: 'ALL_365' as const,
      minStaffDefault: 1,
    });

    // Remaining single-resource brands: 1 process each with varying calendar modes
    for (let bIndex = 1; bIndex < brands.length; bIndex++) {
      if ([4, 8, 12, 16, 20].includes(bIndex)) continue; // already configured above
      const mode =
        bIndex % 4 === 0
          ? 'EXCEPT_SUN_AND_HOLIDAYS'
          : bIndex % 3 === 0
          ? 'EXCEPT_HOLIDAYS'
          : bIndex % 5 === 0
          ? 'CUSTOM'
          : 'ALL_365';

      processData.push({
        brandId: brands[bIndex]._id,
        name: `${brands[bIndex].name} Operations`,
        type: (bIndex % 2 === 0 ? 'CS' : 'NDR') as any,
        calendarMode: mode as any,
        customClosedWeekdays: mode === 'CUSTOM' ? [0, 6] : [],
        minStaffDefault: 1,
        minStaffByWeekday: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 0: mode === 'ALL_365' ? 1 : 0 },
      });
    }

    const processes = await Process.insertMany(processData);

    // 5. Create Assignments (Linking Employees <-> Processes)
    console.log('[Seed] Linking Employees to Processes (Assignments)...');
    const assignmentData = [];

    // Brand 0 (Zing Support): Riya Sharma (Employee index 7) is the SOLE resource for both NDR and CS!
    const riyaId = employees[7]._id;
    assignmentData.push({
      employeeId: riyaId,
      processId: processes[0]._id, // Zing NDR
      isPrimary: true,
      allocationPercent: 50,
    });
    assignmentData.push({
      employeeId: riyaId,
      processId: processes[1]._id, // Zing CS
      isPrimary: true,
      allocationPercent: 50,
    });

    // Multi-resource Brand 4: Snitch Style (processes[2]) -> 2 employees (Aman Verma: 8, Sneha Roy: 9)
    assignmentData.push({
      employeeId: employees[8]._id,
      processId: processes[2]._id,
      isPrimary: true,
      allocationPercent: 100,
    });
    assignmentData.push({
      employeeId: employees[9]._id,
      processId: processes[2]._id,
      isPrimary: true,
      allocationPercent: 100,
    });

    // Multi-resource Brand 8: Bolt Audio (Tech Support: processes[3], Warranty: processes[4])
    // Karan Patel (10), Neha Gupta (11), Arjun Das (12)
    assignmentData.push({
      employeeId: employees[10]._id,
      processId: processes[3]._id,
      isPrimary: true,
      allocationPercent: 100,
    });
    assignmentData.push({
      employeeId: employees[11]._id,
      processId: processes[3]._id,
      isPrimary: true,
      allocationPercent: 100,
    });
    assignmentData.push({
      employeeId: employees[12]._id,
      processId: processes[4]._id,
      isPrimary: true,
      allocationPercent: 100,
    });

    // Multi-resource Brand 12: GlowAura (processes[5], processes[6])
    // Tanvi Mehta (13), Rohan Kulkarni (14)
    assignmentData.push({
      employeeId: employees[13]._id,
      processId: processes[5]._id,
      isPrimary: true,
      allocationPercent: 100,
    });
    assignmentData.push({
      employeeId: employees[14]._id,
      processId: processes[6]._id,
      isPrimary: true,
      allocationPercent: 100,
    });

    // Multi-resource Brand 16: WoodCrafts (processes[7])
    // Ishita Bansal (15), Gaurav Rao (16)
    assignmentData.push({
      employeeId: employees[15]._id,
      processId: processes[7]._id,
      isPrimary: true,
      allocationPercent: 100,
    });
    assignmentData.push({
      employeeId: employees[16]._id,
      processId: processes[7]._id,
      isPrimary: true,
      allocationPercent: 100,
    });

    // Multi-resource Brand 20: FitFuel (processes[8])
    // Simran Kaur (17), Abhishek Mishra (18)
    assignmentData.push({
      employeeId: employees[17]._id,
      processId: processes[8]._id,
      isPrimary: true,
      allocationPercent: 100,
    });
    assignmentData.push({
      employeeId: employees[18]._id,
      processId: processes[8]._id,
      isPrimary: true,
      allocationPercent: 100,
    });

    // Remaining single-resource processes: assign 1 employee each from remaining agents & leads
    let empCursor = 19;
    for (let pIdx = 9; pIdx < processes.length; pIdx++) {
      const assignedEmp = employees[empCursor % employees.length];
      assignmentData.push({
        employeeId: assignedEmp._id,
        processId: processes[pIdx]._id,
        isPrimary: true,
        allocationPercent: 100,
      });
      empCursor++;
    }

    // A few employees cross-assigned to 2 brands (e.g. Aman Verma also covering Brand 1 QuickKart)
    if (processes.length > 9) {
      assignmentData.push({
        employeeId: employees[8]._id,
        processId: processes[9]._id,
        isPrimary: false,
        allocationPercent: 30,
      });
    }

    await Assignment.insertMany(assignmentData);

    // 6. Holidays for July 2026 (India)
    console.log('[Seed] Adding India Public Holidays for July 2026...');
    const holidays = await Holiday.insertMany([
      { date: '2026-07-15', name: 'Guru Purnima / Muharram', region: 'India' },
      { date: '2026-07-28', name: 'Eid-e-Milad (Observed)', region: 'India' },
    ]);

    // 7. Approved Leaves including DEMO SCENARIO
    console.log('[Seed] Adding Approved Leaves including demo scenario...');
    const leaves = await Leave.insertMany([
      // BUILT-IN DEMO SCENARIO:
      // Riya Sharma (sole resource for Zing Support NDR & CS) is on approved leave on Sunday 2026-07-12!
      // This will instantly demonstrate the coverage gap and backup recommender!
      {
        employeeId: riyaId,
        startDate: '2026-07-12',
        endDate: '2026-07-12',
        type: 'planned',
        status: 'approved',
      },
      // Another agent on comp-off
      {
        employeeId: employees[9]._id, // Sneha Roy
        startDate: '2026-07-20',
        endDate: '2026-07-21',
        type: 'comp_off',
        status: 'approved',
      },
    ]);

    // 8. Generate Initial Draft Roster for July 2026
    console.log('[Seed] Generating initial July 2026 roster via pure scheduling engine...');
    const rawRoster = await Roster.create({
      month: 7,
      year: 2026,
      status: 'draft',
      version: 1,
      generatedAt: new Date(),
    });

    const engineResult = generateRoster({
      month: 7,
      year: 2026,
      employees: employees.map(e => ({
        id: (e._id as any).toString(),
        name: e.name,
        email: e.email,
        podId: e.podId ? (e.podId as any).toString() : undefined,
        role: e.role,
        active: e.active,
        preferences: e.preferences,
        maxConsecutiveWorkDays: e.maxConsecutiveWorkDays,
        weeklyOffsPerWeek: e.weeklyOffsPerWeek,
      })),
      processes: processes.map(p => ({
        id: (p._id as any).toString(),
        brandId: (p.brandId as any).toString(),
        name: p.name,
        type: p.type,
        calendarMode: p.calendarMode,
        customClosedWeekdays: p.customClosedWeekdays,
        minStaffDefault: p.minStaffDefault,
        minStaffByWeekday: p.minStaffByWeekday as any,
        dateOverrides: p.dateOverrides,
      })),
      brands: brands.map(b => ({
        id: (b._id as any).toString(),
        name: b.name,
        podId: b.podId ? (b.podId as any).toString() : undefined,
        active: b.active,
      })),
      assignments: assignmentData.map(a => ({
        employeeId: a.employeeId.toString(),
        processId: a.processId.toString(),
        isPrimary: a.isPrimary,
        allocationPercent: a.allocationPercent,
      })),
      holidays: holidays.map(h => ({
        id: (h._id as any).toString(),
        date: h.date,
        name: h.name,
        region: h.region,
      })),
      approvedLeaves: leaves.map(l => ({
        id: (l._id as any).toString(),
        employeeId: l.employeeId.toString(),
        startDate: l.startDate,
        endDate: l.endDate,
        type: l.type,
        status: l.status,
      })),
      rosterId: (rawRoster._id as any).toString(),
    });

    // Save roster entries
    const entriesToSave = engineResult.entries.map(e => ({
      ...e,
      rosterId: rawRoster._id,
    }));
    await RosterEntry.insertMany(entriesToSave);

    // Save earned comp-offs
    if (engineResult.compOffsEarned.length > 0) {
      await CompOffLedger.insertMany(engineResult.compOffsEarned);
    }

    // Log seed event in AuditLog
    await AuditLog.create({
      rosterId: rawRoster._id,
      userId: employees[0]._id,
      userName: employees[0].name,
      action: 'INITIAL_ROSTER_GENERATED',
      details: {
        totalEntries: entriesToSave.length,
        totalIssues: engineResult.issues.length,
        mandatoryIssues: engineResult.issues.filter(i => i.severity === 'MANDATORY').length,
        warnings: engineResult.issues.filter(i => i.severity === 'WARNING').length,
      },
    });

    console.log('[Seed] Seeding completed successfully!');
    console.log(`- 36 Employees created (1 Manager, 6 Pod Leads, 29 Agents)`);
    console.log(`- 6 Pods created`);
    console.log(`- 25 Brands created`);
    console.log(`- ${processes.length} Processes created`);
    console.log(`- Draft Roster for July 2026 created (${entriesToSave.length} entries)`);
    console.log(`- Validation issues detected: ${engineResult.issues.length} (including built-in demo single-resource gap!)`);

    if (exitWhenDone) {
      await disconnectDB();
      process.exit(0);
    }
  } catch (error) {
    console.error('[Seed] Error seeding database:', error);
    if (exitWhenDone) {
      process.exit(1);
    }
    throw error;
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  runSeed(true);
}
