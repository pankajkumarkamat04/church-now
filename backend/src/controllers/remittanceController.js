const Church = require('../models/Church');
const { Payment } = require('../models/Payment');
const ChurchRemittance = require('../models/ChurchRemittance');
const SchoolRemittanceSchool = require('../models/SchoolRemittanceSchool');
const SchoolRemittanceDue = require('../models/SchoolRemittanceDue');
const SchoolRemittancePayment = require('../models/SchoolRemittancePayment');
const SchoolProfile = require('../models/SchoolProfile');

async function ensureLegacySchoolIndexesRemoved() {
  try {
    await SchoolRemittanceSchool.syncIndexes();
    const indexes = await SchoolRemittanceSchool.collection.indexes();
    const legacyNames = indexes
      .filter((idx) => {
        const keys = Object.keys(idx.key || {});
        return keys.includes('church');
      })
      .map((idx) => idx.name)
      .filter(Boolean);

    for (const idxName of legacyNames) {
      try {
        await SchoolRemittanceSchool.collection.dropIndex(idxName);
      } catch {
        // Ignore races or missing-index errors; next writes will still proceed.
      }
    }
  } catch {
    // Ignore namespace-not-found during first boot; collection/indexes will be created on write.
  }
}

async function ensureLegacyChurchRemittanceIndexesRemoved() {
  try {
    await ChurchRemittance.syncIndexes();
    const indexes = await ChurchRemittance.collection.indexes();
    const legacyUnique = indexes
      .filter((idx) => idx.unique)
      .filter((idx) => {
        const keys = Object.keys(idx.key || {});
        if (keys.length === 0) return false;
        if (keys.length === 1 && keys[0] === '_id') return false;
        return keys.includes('church');
      })
      .map((idx) => idx.name)
      .filter(Boolean);

    for (const idxName of legacyUnique) {
      try {
        await ChurchRemittance.collection.dropIndex(idxName);
      } catch {
        // Ignore missing-index/race conditions.
      }
    }
  } catch {
    // Ignore namespace-not-found on first boot.
  }
}

function monthKeyFromDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function compareMonthKeyDesc(a, b) {
  return String(b || '').localeCompare(String(a || ''));
}

function parseMonthRange(monthKey) {
  const [year, month] = String(monthKey || '').split('-').map(Number);
  if (!year || !month || month < 1 || month > 12) return null;
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
}

function remitStatus(due, paid) {
  const d = Number(due || 0);
  const p = Number(paid || 0);
  if (d <= 0) return 'NO_DUE';
  if (p <= 0) return 'PENDING';
  if (p + 0.0001 >= d) return 'PAID';
  return 'PARTIAL';
}

function humanStatus(status) {
  if (status === 'PARTIAL') return 'PARTIALLY_PAID';
  return status;
}

async function buildChurchRemittancePayload(monthKey) {
  const monthRange = parseMonthRange(monthKey);
  if (!monthRange) {
    const e = new Error('Invalid month format, expected YYYY-MM');
    e.statusCode = 400;
    throw e;
  }

  const [churches, incomeAgg, remits] = await Promise.all([
    Church.find({ isActive: true })
      .select('name conference mainChurch')
      .populate('conference', 'name')
      .populate('mainChurch', 'name')
      .sort({ name: 1 })
      .lean(),
    Payment.aggregate([
      { $match: { paidAt: { $gte: monthRange.start, $lt: monthRange.end } } },
      { $group: { _id: '$church', totalIncome: { $sum: '$amount' } } },
    ]),
    ChurchRemittance.find({ monthKey })
      .populate('createdBy', 'fullName email')
      .sort({ paidAt: -1, createdAt: -1 })
      .lean(),
  ]);

  const incomeMap = new Map(incomeAgg.map((row) => [String(row._id), Number(row.totalIncome || 0)]));
  const byChurch = new Map();

  for (const entry of remits) {
    const key = String(entry.church);
    if (!byChurch.has(key)) byChurch.set(key, []);
    byChurch.get(key).push(entry);
  }

  const rows = churches.map((church) => {
    const churchId = String(church._id);
    const income = Number(incomeMap.get(churchId) || 0);
    const dueMain = income * 0.1;
    const dueConference = income * 0.1;
    const entries = byChurch.get(churchId) || [];
    let paidMain = 0;
    let paidConference = 0;

    const mappedEntries = entries.map((entry) => {
      const amt = Number(entry.amount || 0);
      if (entry.remitType === 'MAIN_CHURCH') paidMain += amt;
      if (entry.remitType === 'CONFERENCE') paidConference += amt;
      return {
        id: String(entry._id),
        remitType: entry.remitType,
        amount: amt,
        paidAt: entry.paidAt || null,
        note: entry.note || '',
        createdAt: entry.createdAt || null,
        createdByName:
          (entry.createdBy && (entry.createdBy.fullName || entry.createdBy.email)) ||
          '',
      };
    });

    return {
      churchId,
      churchName: church.name || 'Unnamed church',
      conferenceName: church.conference?.name || 'No conference',
      monthKey,
      totalIncome: income,
      mainChurch: {
        due: dueMain,
        paid: paidMain,
        balance: Math.max(0, dueMain - paidMain),
        status: remitStatus(dueMain, paidMain),
        recipientName: church.mainChurch?.name || 'Main church',
      },
      conference: {
        due: dueConference,
        paid: paidConference,
        balance: Math.max(0, dueConference - paidConference),
        status: remitStatus(dueConference, paidConference),
        recipientName: church.conference?.name || 'Conference',
      },
      paymentStatus: humanStatus(remitStatus(dueMain + dueConference, paidMain + paidConference)),
      entries: mappedEntries,
    };
  });

  return {
    monthKey,
    remitRatePercent: 10,
    rows,
  };
}

async function listChurchRemittances(req, res) {
  const monthKey = String(req.query.month || monthKeyFromDate()).trim();
  const payload = await buildChurchRemittancePayload(monthKey);
  return res.json(payload);
}

async function getChurchRemittanceDetails(req, res) {
  const churchId = String(req.params.churchId || '').trim();
  if (!churchId) return res.status(400).json({ message: 'churchId is required' });
  const selectedMonthKey = String(req.query.month || monthKeyFromDate()).trim();
  if (!parseMonthRange(selectedMonthKey)) {
    return res.status(400).json({ message: 'Invalid month format, expected YYYY-MM' });
  }

  const church = await Church.findById(churchId)
    .select('name conference mainChurch')
    .populate('conference', 'name')
    .populate('mainChurch', 'name')
    .lean();
  if (!church) return res.status(404).json({ message: 'Church not found' });

  const [incomeAgg, remits] = await Promise.all([
    Payment.aggregate([
      { $match: { church: church._id } },
      {
        $group: {
          _id: {
            year: { $year: '$paidAt' },
            month: { $month: '$paidAt' },
          },
          totalIncome: { $sum: '$amount' },
        },
      },
    ]),
    ChurchRemittance.find({ church: church._id })
      .populate('createdBy', 'fullName email')
      .sort({ monthKey: -1, paidAt: -1, createdAt: -1 })
      .lean(),
  ]);

  const incomeByMonth = new Map();
  for (const row of incomeAgg) {
    const year = Number(row?._id?.year || 0);
    const month = Number(row?._id?.month || 0);
    if (!year || !month) continue;
    const mk = `${year}-${String(month).padStart(2, '0')}`;
    incomeByMonth.set(mk, Number(row.totalIncome || 0));
  }

  const remitsByMonth = new Map();
  for (const entry of remits) {
    const mk = String(entry.monthKey || '').trim();
    if (!mk) continue;
    if (!remitsByMonth.has(mk)) remitsByMonth.set(mk, []);
    remitsByMonth.get(mk).push(entry);
  }

  const monthKeys = Array.from(new Set([...incomeByMonth.keys(), ...remitsByMonth.keys()])).sort(compareMonthKeyDesc);
  if (!monthKeys.includes(selectedMonthKey)) monthKeys.unshift(selectedMonthKey);

  const monthlyRows = monthKeys.map((monthKey) => {
    const income = Number(incomeByMonth.get(monthKey) || 0);
    const dueMain = income * 0.1;
    const dueConference = income * 0.1;
    const monthEntries = remitsByMonth.get(monthKey) || [];
    let paidMain = 0;
    let paidConference = 0;

    for (const entry of monthEntries) {
      const amount = Number(entry.amount || 0);
      if (entry.remitType === 'MAIN_CHURCH') paidMain += amount;
      if (entry.remitType === 'CONFERENCE') paidConference += amount;
    }

    return {
      monthKey,
      totalIncome: income,
      mainChurch: {
        due: dueMain,
        paid: paidMain,
        balance: Math.max(0, dueMain - paidMain),
        status: remitStatus(dueMain, paidMain),
        recipientName: church.mainChurch?.name || 'Main church',
      },
      conference: {
        due: dueConference,
        paid: paidConference,
        balance: Math.max(0, dueConference - paidConference),
        status: remitStatus(dueConference, paidConference),
        recipientName: church.conference?.name || 'Conference',
      },
      paymentStatus: humanStatus(remitStatus(dueMain + dueConference, paidMain + paidConference)),
    };
  });

  const lifetimeEntries = remits.map((entry) => ({
    id: String(entry._id),
    monthKey: entry.monthKey,
    remitType: entry.remitType,
    amount: Number(entry.amount || 0),
    paidAt: entry.paidAt || null,
    note: entry.note || '',
    createdAt: entry.createdAt || null,
    createdByName: (entry.createdBy && (entry.createdBy.fullName || entry.createdBy.email)) || '',
  }));

  const lifetimeSummary = monthlyRows.reduce(
    (acc, row) => {
      acc.totalIncome += Number(row.totalIncome || 0);
      acc.mainChurchDue += Number(row.mainChurch.due || 0);
      acc.mainChurchPaid += Number(row.mainChurch.paid || 0);
      acc.conferenceDue += Number(row.conference.due || 0);
      acc.conferencePaid += Number(row.conference.paid || 0);
      return acc;
    },
    { totalIncome: 0, mainChurchDue: 0, mainChurchPaid: 0, conferenceDue: 0, conferencePaid: 0 }
  );
  lifetimeSummary.mainChurchBalance = Math.max(0, lifetimeSummary.mainChurchDue - lifetimeSummary.mainChurchPaid);
  lifetimeSummary.conferenceBalance = Math.max(0, lifetimeSummary.conferenceDue - lifetimeSummary.conferencePaid);
  lifetimeSummary.totalDue = lifetimeSummary.mainChurchDue + lifetimeSummary.conferenceDue;
  lifetimeSummary.totalPaid = lifetimeSummary.mainChurchPaid + lifetimeSummary.conferencePaid;
  lifetimeSummary.totalBalance = Math.max(0, lifetimeSummary.totalDue - lifetimeSummary.totalPaid);
  lifetimeSummary.paymentStatus = humanStatus(remitStatus(lifetimeSummary.totalDue, lifetimeSummary.totalPaid));

  const selectedMonth =
    monthlyRows.find((row) => row.monthKey === selectedMonthKey) ||
    monthlyRows[0] || {
      monthKey: selectedMonthKey,
      totalIncome: 0,
      mainChurch: { due: 0, paid: 0, balance: 0, status: 'NO_DUE', recipientName: church.mainChurch?.name || 'Main church' },
      conference: { due: 0, paid: 0, balance: 0, status: 'NO_DUE', recipientName: church.conference?.name || 'Conference' },
      paymentStatus: 'NO_DUE',
    };

  return res.json({
    monthKey: selectedMonthKey,
    remitRatePercent: 10,
    row: {
      churchId: String(church._id),
      churchName: church.name || 'Unnamed church',
      conferenceName: church.conference?.name || 'No conference',
      totalIncome: selectedMonth.totalIncome,
      mainChurch: selectedMonth.mainChurch,
      conference: selectedMonth.conference,
      paymentStatus: selectedMonth.paymentStatus,
      entries: lifetimeEntries.filter((entry) => entry.monthKey === selectedMonth.monthKey),
    },
    selectedMonth,
    lifetimeSummary,
    lifetimeEntries,
    monthlyRows,
  });
}

async function recordChurchRemittance(req, res) {
  const churchId = String(req.params.churchId || '').trim();
  if (!churchId) return res.status(400).json({ message: 'churchId is required' });

  await ensureLegacyChurchRemittanceIndexesRemoved();

  const monthKey = String(req.body?.month || monthKeyFromDate()).trim();
  if (!parseMonthRange(monthKey)) {
    return res.status(400).json({ message: 'Invalid month format, expected YYYY-MM' });
  }

  const mainAmount = Number(req.body?.mainChurchAmount || 0);
  const confAmount = Number(req.body?.conferenceAmount || 0);
  const paidAt = req.body?.paidAt ? new Date(req.body.paidAt) : new Date();
  const note = String(req.body?.note || '').trim();

  if ((!Number.isFinite(mainAmount) || mainAmount <= 0) && (!Number.isFinite(confAmount) || confAmount <= 0)) {
    return res.status(400).json({ message: 'Enter main church or conference amount' });
  }

  const writes = [];
  if (Number.isFinite(mainAmount) && mainAmount > 0) {
    writes.push(
      ChurchRemittance.create({
        church: churchId,
        monthKey,
        remitType: 'MAIN_CHURCH',
        amount: mainAmount,
        paidAt,
        note,
        createdBy: req.user?._id || null,
        updatedBy: req.user?._id || null,
      })
    );
  }
  if (Number.isFinite(confAmount) && confAmount > 0) {
    writes.push(
      ChurchRemittance.create({
        church: churchId,
        monthKey,
        remitType: 'CONFERENCE',
        amount: confAmount,
        paidAt,
        note,
        createdBy: req.user?._id || null,
        updatedBy: req.user?._id || null,
      })
    );
  }
  try {
    await Promise.all(writes);
  } catch (e) {
    if (e?.code === 11000) {
      await ensureLegacyChurchRemittanceIndexesRemoved();
      await Promise.all(writes);
    } else {
      throw e;
    }
  }
  const payload = await buildChurchRemittancePayload(monthKey);
  return res.status(201).json(payload);
}

async function updateChurchRemittanceEntry(req, res) {
  const entryId = String(req.params.entryId || '').trim();
  if (!entryId) return res.status(400).json({ message: 'entryId is required' });

  const entry = await ChurchRemittance.findById(entryId);
  if (!entry) return res.status(404).json({ message: 'Remittance entry not found' });

  if (req.body?.amount !== undefined) {
    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Valid amount is required' });
    }
    entry.amount = amount;
  }
  if (req.body?.paidAt !== undefined) {
    entry.paidAt = req.body.paidAt ? new Date(req.body.paidAt) : entry.paidAt;
  }
  if (req.body?.note !== undefined) {
    entry.note = String(req.body.note || '').trim();
  }
  if (req.body?.remitType !== undefined) {
    const remitType = String(req.body.remitType || '').trim().toUpperCase();
    if (!['MAIN_CHURCH', 'CONFERENCE'].includes(remitType)) {
      return res.status(400).json({ message: 'remitType must be MAIN_CHURCH or CONFERENCE' });
    }
    entry.remitType = remitType;
  }
  entry.updatedBy = req.user?._id || entry.updatedBy || null;
  await entry.save();
  const payload = await buildChurchRemittancePayload(entry.monthKey);
  return res.json(payload);
}

function resolveDueStatus(dueAmount, paidAmount) {
  if (paidAmount <= 0) return 'PENDING';
  if (paidAmount + 0.0001 >= dueAmount) return 'PAID';
  return 'PARTIAL';
}

async function buildSchoolRemittancePayload(year) {
  const y = Number(year);
  const queryYear = Number.isFinite(y) && y >= 2000 && y <= 3000 ? y : new Date().getFullYear();
  const yearStart = new Date(queryYear, 0, 1);
  const yearEnd = new Date(queryYear + 1, 0, 1);

  const [schools, dues, payments] = await Promise.all([
    SchoolRemittanceSchool.find({})
      .populate('profile')
      .sort({ createdAt: -1 })
      .lean(),
    SchoolRemittanceDue.find({ year: queryYear }).sort({ dueDate: 1, label: 1 }).lean(),
    SchoolRemittancePayment.find({ paidAt: { $gte: yearStart, $lt: yearEnd } })
      .populate('createdBy', 'fullName email')
      .sort({ paidAt: -1, createdAt: -1 })
      .lean(),
  ]);

  const duesBySchool = new Map();
  for (const due of dues) {
    const key = String(due.school);
    if (!duesBySchool.has(key)) duesBySchool.set(key, []);
    duesBySchool.get(key).push(due);
  }

  const paymentsBySchool = new Map();
  for (const payment of payments) {
    const key = String(payment.school);
    if (!paymentsBySchool.has(key)) paymentsBySchool.set(key, []);
    paymentsBySchool.get(key).push(payment);
  }

  const rows = schools.map((school) => {
    const schoolId = String(school._id);
    const profile = school.profile || {};
    const dueRows = (duesBySchool.get(schoolId) || []).map((due) => {
      const dueAmount = Number(due.dueAmount || 0);
      const paidAmount = Number(due.paidAmount || 0);
      return {
        id: String(due._id),
        label: due.label,
        termKey: due.termKey,
        dueAmount,
        paidAmount,
        balance: Math.max(0, dueAmount - paidAmount),
        dueDate: due.dueDate || null,
        status: resolveDueStatus(dueAmount, paidAmount),
        note: due.note || '',
      };
    });

    const paymentRows = (paymentsBySchool.get(schoolId) || []).map((payment) => ({
      id: String(payment._id),
      dueId: payment.due ? String(payment.due) : null,
      amount: Number(payment.amount || 0),
      paidAt: payment.paidAt || null,
      paymentMethod: payment.paymentMethod || '',
      referenceNo: payment.referenceNo || '',
      note: payment.note || '',
      createdByName:
        (payment.createdBy && (payment.createdBy.fullName || payment.createdBy.email)) || '',
    }));

    const totalDue = dueRows.reduce((sum, due) => sum + due.dueAmount, 0);
    const totalPaid = paymentRows.reduce((sum, payment) => sum + payment.amount, 0);

    return {
      schoolId,
      schoolName: profile.name || 'Unnamed school',
      contactPerson: profile.contactPerson || '',
      phone: profile.phone || '',
      email: profile.email || '',
      address: profile.address || '',
      note: profile.note || school.note || '',
      totalDue,
      totalPaid,
      totalBalance: Math.max(0, totalDue - totalPaid),
      paymentStatus: humanStatus(resolveDueStatus(totalDue, totalPaid)),
      dues: dueRows,
      payments: paymentRows,
      isActive: Boolean(school.isActive),
    };
  });

  return { year: queryYear, remitRatePercent: 10, paymentWindowsPerYear: 3, rows };
}

async function listSchoolRemittances(req, res) {
  const payload = await buildSchoolRemittancePayload(req.query.year);
  return res.json(payload);
}

async function getSchoolRemittanceDetails(req, res) {
  const schoolId = String(req.params.schoolId || '').trim();
  if (!schoolId) return res.status(400).json({ message: 'schoolId is required' });
  const payload = await buildSchoolRemittancePayload(req.query.year);
  const row = (payload.rows || []).find((item) => item.schoolId === schoolId);
  if (!row) return res.status(404).json({ message: 'School remittance data not found for selected period' });
  return res.json({
    year: payload.year,
    remitRatePercent: payload.remitRatePercent,
    paymentWindowsPerYear: payload.paymentWindowsPerYear,
    row,
  });
}

async function createSchool(req, res) {
  try {
    await ensureLegacySchoolIndexesRemoved();
    const name = String(req.body?.name || '').trim();
    const contactPerson = String(req.body?.contactPerson || '').trim();
    const phone = String(req.body?.phone || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const address = String(req.body?.address || '').trim();
    const note = String(req.body?.note || '').trim();
    if (!name) return res.status(400).json({ message: 'School name is required' });

    const profile = await SchoolProfile.create({
      name,
      contactPerson,
      phone,
      email,
      address,
      note,
      createdBy: req.user?._id || null,
      updatedBy: req.user?._id || null,
    });

    let created;
    try {
      created = await SchoolRemittanceSchool.create({
        profile: profile._id,
        note,
      });
    } catch (e) {
      if (e?.code === 11000 && e?.keyPattern?.church) {
        await ensureLegacySchoolIndexesRemoved();
        created = await SchoolRemittanceSchool.create({
          profile: profile._id,
          note,
        });
      } else {
        throw e;
      }
    }

    return res.status(201).json({
      id: String(created._id),
      profileId: String(profile._id),
      name: profile.name,
      contactPerson: profile.contactPerson || '',
      phone: profile.phone || '',
      email: profile.email || '',
      address: profile.address || '',
      note: profile.note || '',
      isActive: created.isActive,
    });
  } catch (err) {
    if (err?.code === 11000) {
      const key = Object.keys(err?.keyPattern || {})[0] || '';
      if (key === 'name') {
        return res.status(409).json({ message: 'School name already in use' });
      }
      if (key === 'profile') {
        return res.status(409).json({ message: 'School profile already in use' });
      }
      if (key === 'church') {
        return res.status(409).json({ message: 'Church is already in use' });
      }
      return res.status(409).json({ message: 'Duplicate value already in use' });
    }
    throw err;
  }
}

async function updateSchool(req, res) {
  const schoolId = String(req.params.schoolId || '').trim();
  const school = await SchoolRemittanceSchool.findById(schoolId);
  if (!school) return res.status(404).json({ message: 'School not found' });

  const profile = await SchoolProfile.findById(school.profile);
  if (!profile) return res.status(404).json({ message: 'School profile not found' });

  const fields = ['name', 'contactPerson', 'phone', 'email', 'address', 'note', 'isActive'];
  for (const key of fields) {
    if (req.body?.[key] !== undefined) {
      if (key === 'isActive') {
        profile.isActive = Boolean(req.body[key]);
      } else if (key === 'email') {
        profile.email = String(req.body[key] || '').trim().toLowerCase();
      } else {
        profile[key] = String(req.body[key] || '').trim();
      }
    }
  }
  profile.updatedBy = req.user?._id || profile.updatedBy || null;
  await profile.save();
  return res.json({
    schoolId: String(school._id),
    profileId: String(profile._id),
    name: profile.name,
    contactPerson: profile.contactPerson || '',
    phone: profile.phone || '',
    email: profile.email || '',
    address: profile.address || '',
    note: profile.note || '',
    isActive: Boolean(profile.isActive),
  });
}

async function addSchoolDue(req, res) {
  const schoolId = String(req.params.schoolId || '').trim();
  const school = await SchoolRemittanceSchool.findById(schoolId).select('_id').lean();
  if (!school) return res.status(404).json({ message: 'School not found' });

  const dueAmount = Number(req.body?.dueAmount);
  if (!Number.isFinite(dueAmount) || dueAmount <= 0) {
    return res.status(400).json({ message: 'Valid dueAmount is required' });
  }

  const yearRaw = Number(req.body?.year);
  const year = Number.isFinite(yearRaw) && yearRaw >= 2000 && yearRaw <= 3000 ? yearRaw : new Date().getFullYear();
  const termKey = ['TERM_1', 'TERM_2', 'TERM_3', 'CUSTOM'].includes(String(req.body?.termKey || ''))
    ? String(req.body.termKey)
    : 'CUSTOM';
  const label = String(req.body?.label || '').trim() || `Due ${year}`;
  const dueDate = req.body?.dueDate ? new Date(req.body.dueDate) : null;
  const note = String(req.body?.note || '').trim();

  const due = await SchoolRemittanceDue.create({
    school: schoolId,
    year,
    termKey,
    label,
    dueAmount,
    paidAmount: 0,
    dueDate,
    note,
    status: 'PENDING',
    createdBy: req.user?._id || null,
    updatedBy: req.user?._id || null,
  });
  return res.status(201).json(due);
}

async function updateSchoolDue(req, res) {
  const dueId = String(req.params.dueId || '').trim();
  if (!dueId) return res.status(400).json({ message: 'dueId is required' });

  const due = await SchoolRemittanceDue.findById(dueId);
  if (!due) return res.status(404).json({ message: 'Due not found' });

  if (req.body?.label !== undefined) {
    due.label = String(req.body.label || '').trim() || due.label;
  }
  if (req.body?.termKey !== undefined) {
    const termKey = String(req.body.termKey || '').trim();
    if (!['TERM_1', 'TERM_2', 'TERM_3', 'CUSTOM'].includes(termKey)) {
      return res.status(400).json({ message: 'Invalid termKey' });
    }
    due.termKey = termKey;
  }
  if (req.body?.dueAmount !== undefined) {
    const dueAmount = Number(req.body.dueAmount);
    if (!Number.isFinite(dueAmount) || dueAmount <= 0) {
      return res.status(400).json({ message: 'Valid dueAmount is required' });
    }
    due.dueAmount = dueAmount;
  }
  if (req.body?.dueDate !== undefined) {
    due.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;
  }
  if (req.body?.note !== undefined) {
    due.note = String(req.body.note || '').trim();
  }
  due.status = resolveDueStatus(Number(due.dueAmount || 0), Number(due.paidAmount || 0));
  due.updatedBy = req.user?._id || due.updatedBy || null;
  await due.save();
  return res.json(due);
}

async function deleteChurchRemittanceEntry(req, res) {
  const entryId = String(req.params.entryId || '').trim();
  if (!entryId) return res.status(400).json({ message: 'entryId is required' });
  const entry = await ChurchRemittance.findByIdAndDelete(entryId);
  if (!entry) return res.status(404).json({ message: 'Remittance entry not found' });
  const payload = await buildChurchRemittancePayload(entry.monthKey);
  return res.json(payload);
}

async function deleteSchoolDue(req, res) {
  const dueId = String(req.params.dueId || '').trim();
  if (!dueId) return res.status(400).json({ message: 'dueId is required' });
  const linkedPayments = await SchoolRemittancePayment.countDocuments({ due: dueId });
  if (linkedPayments > 0) {
    return res.status(400).json({ message: 'Cannot delete due with linked payments' });
  }
  const due = await SchoolRemittanceDue.findByIdAndDelete(dueId);
  if (!due) return res.status(404).json({ message: 'Due not found' });
  return res.status(204).send();
}

async function deleteSchoolPayment(req, res) {
  const paymentId = String(req.params.paymentId || '').trim();
  if (!paymentId) return res.status(400).json({ message: 'paymentId is required' });
  const payment = await SchoolRemittancePayment.findById(paymentId);
  if (!payment) return res.status(404).json({ message: 'Payment not found' });
  if (payment.due) {
    const due = await SchoolRemittanceDue.findById(payment.due);
    if (due) {
      due.paidAmount = Math.max(0, Number(due.paidAmount || 0) - Number(payment.amount || 0));
      due.status = resolveDueStatus(Number(due.dueAmount || 0), Number(due.paidAmount || 0));
      due.updatedBy = req.user?._id || due.updatedBy || null;
      await due.save();
    }
  }
  await payment.deleteOne();
  return res.status(204).send();
}

async function recordSchoolPayment(req, res) {
  const schoolId = String(req.params.schoolId || '').trim();
  const school = await SchoolRemittanceSchool.findById(schoolId).select('_id').lean();
  if (!school) return res.status(404).json({ message: 'School not found' });

  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ message: 'Valid amount is required' });
  }
  const dueId = String(req.body?.dueId || '').trim() || null;
  const paidAt = req.body?.paidAt ? new Date(req.body.paidAt) : new Date();
  const paymentMethod = String(req.body?.paymentMethod || '').trim();
  const referenceNo = String(req.body?.referenceNo || '').trim();
  const note = String(req.body?.note || '').trim();

  let dueDoc = null;
  if (dueId) {
    dueDoc = await SchoolRemittanceDue.findOne({ _id: dueId, school: schoolId });
    if (!dueDoc) return res.status(404).json({ message: 'Due record not found for school' });
  }

  const payment = await SchoolRemittancePayment.create({
    school: schoolId,
    due: dueDoc ? dueDoc._id : null,
    amount,
    paidAt,
    paymentMethod,
    referenceNo,
    note,
    createdBy: req.user?._id || null,
  });

  if (dueDoc) {
    dueDoc.paidAmount = Number(dueDoc.paidAmount || 0) + amount;
    dueDoc.status = resolveDueStatus(Number(dueDoc.dueAmount || 0), Number(dueDoc.paidAmount || 0));
    dueDoc.updatedBy = req.user?._id || dueDoc.updatedBy || null;
    await dueDoc.save();
  }

  return res.status(201).json(payment);
}

async function listRemittanceHistory(req, res) {
  const limitRaw = Number(req.query?.limit);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 1000) : 300;

  const [churchEntries, schoolProfiles, dues, payments] = await Promise.all([
    ChurchRemittance.find({})
      .populate('church', 'name')
      .populate('createdBy', 'fullName email')
      .populate('updatedBy', 'fullName email')
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(limit)
      .lean(),
    SchoolProfile.find({})
      .populate('createdBy', 'fullName email')
      .populate('updatedBy', 'fullName email')
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(limit)
      .lean(),
    SchoolRemittanceDue.find({})
      .populate({
        path: 'school',
        select: 'profile',
        populate: { path: 'profile', select: 'name' },
      })
      .populate('createdBy', 'fullName email')
      .populate('updatedBy', 'fullName email')
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(limit)
      .lean(),
    SchoolRemittancePayment.find({})
      .populate({
        path: 'school',
        select: 'profile',
        populate: { path: 'profile', select: 'name' },
      })
      .populate('due', 'label')
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
  ]);

  const rows = [];
  for (const c of churchEntries) {
    rows.push({
      id: `church-remit-${c._id}`,
      scope: 'CHURCH_REMIT',
      action: c.updatedAt && c.createdAt && String(c.updatedAt) !== String(c.createdAt) ? 'UPDATED' : 'CREATED',
      at: c.updatedAt || c.createdAt || c.paidAt,
      actor:
        (c.updatedBy && (c.updatedBy.fullName || c.updatedBy.email)) ||
        (c.createdBy && (c.createdBy.fullName || c.createdBy.email)) ||
        'System',
      entity: c.church?.name || 'Unknown church',
      details: `${c.remitType} USD ${Number(c.amount || 0).toFixed(2)} (${c.monthKey || ''})`,
    });
  }
  for (const s of schoolProfiles) {
    rows.push({
      id: `school-profile-${s._id}`,
      scope: 'SCHOOL_PROFILE',
      action: s.updatedAt && s.createdAt && String(s.updatedAt) !== String(s.createdAt) ? 'UPDATED' : 'CREATED',
      at: s.updatedAt || s.createdAt,
      actor:
        (s.updatedBy && (s.updatedBy.fullName || s.updatedBy.email)) ||
        (s.createdBy && (s.createdBy.fullName || s.createdBy.email)) ||
        'System',
      entity: s.name || 'Unnamed school',
      details: `Contact: ${s.contactPerson || '—'} · Phone: ${s.phone || '—'}`,
    });
  }
  for (const d of dues) {
    const schoolName = d.school?.profile?.name || 'Unknown school';
    rows.push({
      id: `school-due-${d._id}`,
      scope: 'SCHOOL_DUE',
      action: d.updatedAt && d.createdAt && String(d.updatedAt) !== String(d.createdAt) ? 'UPDATED' : 'CREATED',
      at: d.updatedAt || d.createdAt || d.dueDate,
      actor:
        (d.updatedBy && (d.updatedBy.fullName || d.updatedBy.email)) ||
        (d.createdBy && (d.createdBy.fullName || d.createdBy.email)) ||
        'System',
      entity: schoolName,
      details: `${d.label} · Due ${Number(d.dueAmount || 0).toFixed(2)} · Paid ${Number(d.paidAmount || 0).toFixed(2)} · ${d.status}`,
    });
  }
  for (const p of payments) {
    const schoolName = p.school?.profile?.name || 'Unknown school';
    rows.push({
      id: `school-payment-${p._id}`,
      scope: 'SCHOOL_PAYMENT',
      action: 'CREATED',
      at: p.createdAt || p.paidAt,
      actor: (p.createdBy && (p.createdBy.fullName || p.createdBy.email)) || 'System',
      entity: schoolName,
      details: `USD ${Number(p.amount || 0).toFixed(2)} · ${p.paymentMethod || 'No method'} · Due: ${p.due?.label || 'n/a'}`,
    });
  }

  rows.sort((a, b) => {
    const ta = a.at ? new Date(a.at).getTime() : 0;
    const tb = b.at ? new Date(b.at).getTime() : 0;
    return tb - ta;
  });

  return res.json({ rows: rows.slice(0, limit) });
}

module.exports = {
  listChurchRemittances,
  getChurchRemittanceDetails,
  recordChurchRemittance,
  updateChurchRemittanceEntry,
  deleteChurchRemittanceEntry,
  listSchoolRemittances,
  getSchoolRemittanceDetails,
  createSchool,
  updateSchool,
  addSchoolDue,
  updateSchoolDue,
  deleteSchoolDue,
  recordSchoolPayment,
  deleteSchoolPayment,
  listRemittanceHistory,
};
