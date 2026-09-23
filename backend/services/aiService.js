const BloodBank = require('../models/BloodBank');
const BloodInventory = require('../models/BloodInventory');
const Donor = require('../models/Donor');
const BloodRequest = require('../models/BloodRequest');

// Blood Compatibility Map (Recipient blood group -> Allowed Donor blood groups)
const COMPATIBILITY_MAP = {
  'O-': ['O-'],
  'O+': ['O-', 'O+'],
  'A-': ['O-', 'A-'],
  'A+': ['O-', 'O+', 'A-', 'A+'],
  'B-': ['O-', 'B-'],
  'B+': ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']
};

/**
 * 1. Smart Blood Source Matching
 */
const findMatches = async (bloodGroup, unitsRequired, coordinates = [77.2090, 28.6139], emergencyLevel = 'URGENT') => {
  const compatibleDonorGroups = COMPATIBILITY_MAP[bloodGroup] || [bloodGroup];

  // Match Blood Banks
  const bloodBanks = await BloodBank.find({ isVerified: true });
  const bankMatches = [];

  for (const bank of bloodBanks) {
    const inventories = await BloodInventory.find({
      bloodBankId: bank._id,
      bloodGroup: { $in: compatibleDonorGroups }
    });

    let totalAvailable = 0;
    let exactMatchUnits = 0;

    inventories.forEach(inv => {
      totalAvailable += inv.availableUnits;
      if (inv.bloodGroup === bloodGroup) {
        exactMatchUnits += inv.availableUnits;
      }
    });

    if (totalAvailable > 0) {
      // Calculate distance score (approximate dist calculation in km)
      const bankLng = bank.location.coordinates[0] || 77.2090;
      const bankLat = bank.location.coordinates[1] || 28.6139;
      const distanceKm = Math.round(
        Math.sqrt(Math.pow(coordinates[0] - bankLng, 2) + Math.pow(coordinates[1] - bankLat, 2)) * 111
      );

      // Score components: Stock ratio (40%), Distance (30%), Exact match (30%)
      const stockScore = Math.min(100, (totalAvailable / unitsRequired) * 100);
      const distanceScore = Math.max(0, 100 - distanceKm * 2);
      const matchScore = Math.round((stockScore * 0.4) + (distanceScore * 0.3) + (exactMatchUnits > 0 ? 30 : 10));

      bankMatches.push({
        sourceType: 'BLOOD_BANK',
        bloodBank: {
          _id: bank._id,
          name: bank.name,
          address: bank.address,
          city: bank.city,
          phone: bank.phone,
          operatingHours: bank.operatingHours
        },
        availableUnits: totalAvailable,
        exactMatchUnits,
        distanceKm,
        compatibilityScore: Math.min(100, matchScore)
      });
    }
  }

  // Sort Blood Banks by score descending
  bankMatches.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

  // Match Individual Donors
  const eligibleDonors = await Donor.find({
    bloodGroup: { $in: compatibleDonorGroups },
    isAvailable: true
  }).populate('userId', 'name phone email');

  const donorMatches = [];

  for (const donor of eligibleDonors) {
    const donorLng = donor.location ? donor.location.coordinates[0] : 77.2090;
    const donorLat = donor.location ? donor.location.coordinates[1] : 28.6139;
    const distanceKm = Math.round(
      Math.sqrt(Math.pow(coordinates[0] - donorLng, 2) + Math.pow(coordinates[1] - donorLat, 2)) * 111
    );

    const isExact = donor.bloodGroup === bloodGroup;
    const distanceScore = Math.max(0, 100 - distanceKm * 2);
    const score = Math.round((isExact ? 60 : 40) + (distanceScore * 0.4));

    donorMatches.push({
      sourceType: 'DONOR',
      donor: {
        _id: donor._id,
        name: donor.userId ? donor.userId.name : 'Registered Donor',
        bloodGroup: donor.bloodGroup,
        city: donor.city,
        lastDonationDate: donor.lastDonationDate,
        totalDonations: donor.totalDonations
      },
      distanceKm,
      compatibilityScore: Math.min(100, score)
    });
  }

  donorMatches.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

  return {
    bloodBanks: bankMatches.slice(0, 5),
    donors: donorMatches.slice(0, 10)
  };
};

/**
 * 2. Emergency Priority Prediction
 */
const predictEmergencyPriority = (requestData) => {
  const { unitsRequired = 1, requiredByDate, reason = '', age = 30 } = requestData;
  let score = 50; // base score

  const lowerReason = reason.toLowerCase();
  const criticalKeywords = ['critical', 'icu', 'accident', 'hemorrhage', 'severe', 'trauma', 'bleeding', 'surgery', 'emergency'];
  const urgentKeywords = ['urgent', 'cancer', 'chemo', 'delivery', 'anemia', 'platelets'];

  criticalKeywords.forEach(word => {
    if (lowerReason.includes(word)) score += 20;
  });

  urgentKeywords.forEach(word => {
    if (lowerReason.includes(word)) score += 10;
  });

  if (unitsRequired >= 4) score += 20;
  else if (unitsRequired >= 2) score += 10;

  if (requiredByDate) {
    const hoursLeft = (new Date(requiredByDate).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursLeft <= 4) score += 30;
    else if (hoursLeft <= 12) score += 20;
    else if (hoursLeft <= 24) score += 10;
  }

  score = Math.min(99, Math.max(15, score));

  let level = 'ROUTINE';
  if (score >= 75) level = 'CRITICAL';
  else if (score >= 50) level = 'URGENT';

  return {
    priorityScore: score,
    emergencyLevel: level,
    confidence: Math.min(95, 70 + Math.round(score * 0.25)),
    recommendations: generateCoordinationRecommendation(level, unitsRequired)
  };
};

/**
 * 3. Demand Prediction Engine
 */
const predictDemand = async () => {
  const recentRequests = await BloodRequest.find().select('bloodGroup unitsRequired createdAt emergencyLevel');
  
  const groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const demandMap = {};
  groups.forEach(g => demandMap[g] = { requestedUnits: 0, criticalCount: 0, predictedNext7Days: 0 });

  recentRequests.forEach(req => {
    if (demandMap[req.bloodGroup]) {
      demandMap[req.bloodGroup].requestedUnits += (req.unitsRequired || 1);
      if (req.emergencyLevel === 'CRITICAL') demandMap[req.bloodGroup].criticalCount += 1;
    }
  });

  // Simple exponential smoothing / forecast
  groups.forEach(g => {
    const base = demandMap[g].requestedUnits || 5;
    const boost = demandMap[g].criticalCount * 2;
    demandMap[g].predictedNext7Days = Math.round(base * 1.25 + boost + 3);
  });

  return demandMap;
};

/**
 * 4. Smart Thalassemia Reminder Generator
 */
const calculateThalassemiaReminder = (lastTransfusionDate, intervalDays = 21) => {
  const last = new Date(lastTransfusionDate);
  const next = new Date(last.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  const now = new Date();
  
  const daysUntilNext = Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isDueSoon = daysUntilNext <= 3;

  return {
    nextExpectedDate: next,
    daysUntilNext,
    isDueSoon,
    message: isDueSoon 
      ? `Your next scheduled blood transfusion is due in ${daysUntilNext} days (${next.toLocaleDateString()}). Please coordinate with your hospital/blood bank in advance.`
      : `Next transfusion estimated on ${next.toLocaleDateString()} (${daysUntilNext} days remaining).`
  };
};

/**
 * 5. Coordination Recommendation Generator
 */
const generateCoordinationRecommendation = (level, units) => {
  if (level === 'CRITICAL') {
    return `CRITICAL PRIORITY ACTION: Reserve ${units} units from nearest Blood Bank immediately. Simultaneously dispatch notification to top 5 compatible O- / local donors. Inform ICU team.`;
  } else if (level === 'URGENT') {
    return `URGENT ACTION: Verify request with hospital staff within 30 mins. Match with nearby Blood Bank stock and alert available local donors.`;
  }
  return `ROUTINE ACTION: Process blood requirement during regular operating window. Match with standard blood bank inventory.`;
};

/**
 * 6. Multilingual AI Assistant Engine
 */
const processMultilingualChat = async ({ query = '', language = 'en', contextData = {} }) => {
  const q = (query || '').toLowerCase().trim();
  const lang = ['en', 'hi', 'pa', 'bn', 'es'].includes(language) ? language : 'en';

  const user = contextData.user || null;
  const userRequests = contextData.userRequests || [];
  const inventories = contextData.inventories || [];
  const donorProfile = contextData.donorProfile || null;
  const thalassemiaProfiles = contextData.thalassemiaProfiles || [];

  // Medical Safety Trigger
  const isPureMedical = ['diagnose', 'medicine', 'prescription', 'symptom', 'cure', 'disease', 'pill', 'dose', 'drug', 'treatment'].some(term => q.includes(term));
  const isEmergency = ['heart attack', 'stroke', 'unconscious', 'dying', 'cpr', 'call ambulance', '108', '911'].some(term => q.includes(term));

  if (isPureMedical || isEmergency) {
    const safetyReplies = {
      en: "⚠️ **Medical Safety Disclaimer**: RaktSaarthi is a smart blood coordination platform and does not offer medical diagnoses or prescribe treatment. For acute medical emergencies, please immediately contact local emergency services (108 / 112) or reach out to your attending physician at the hospital.",
      hi: "⚠️ **चिकित्सा सुरक्षा चेतावनी**: रक्तसारथी केवल एक स्मार्ट रक्त समन्वय प्लेटफॉर्म है और यह चिकित्सीय निदान या उपचार का सुझाव नहीं देता है। किसी भी गंभीर आपात स्थिति में, कृपया तुरंत आपातकालीन नंबर (108 / 112) या अपने अस्पताल के डॉक्टर से संपर्क करें।",
      pa: "⚠️ **ਮੈਡੀਕਲ ਸੁਰੱਖਿਆ ਚੇਤਾਵਨੀ**: ਰਕਤਸਾਰਥੀ ਸਿਰਫ਼ ਇੱਕ ਸਮਾਰਟ ਬਲੱਡ ਕੋਆਰਡੀਨੇਸ਼ਨ ਪਲੇਟਫਾਰਮ ਹੈ। ਕਿਸੇ ਵੀ ਗੰਭੀਰ ਡਾਕਟਰੀ ਐਮਰਜੈਂਸੀ ਵਿੱਚ, ਕਿਰਪਾ ਕਰਕੇ ਤੁਰੰਤ ਐਮਰਜੈਂਸੀ ਸੇਵਾਵਾਂ (108/112) ਜਾਂ ਆਪਣੇ ਹਸਪਤਾਲ ਦੇ ਡਾਕਟਰ ਨਾਲ ਸੰਪਰਕ ਕਰੋ।",
      bn: "⚠️ **চিকিৎসা সুরক্ষা সতর্কতা**: রক্তসারথী একটি স্মার্ট রক্ত সমন্বয় প্ল্যাটফর্ম এবং এটি কোনো ডায়াগনসিস বা চিকিৎসার প্রেসক্রিপশন প্রদান করে না। যেকোনো জরুরী পরিস্থিতিতে অবিলম্বে নিকটস্থ হাসপাতাল বা জরুরী নম্বরে (১০৮ / ১১২) যোগাযোগ করুন।",
      es: "⚠️ **Aviso de Seguridad Médica**: RaktSaarthi es una plataforma de coordinación de sangre y no ofrece diagnósticos ni prescripciones médicas. Para emergencias agudas, comuníquese de inmediato con los servicios de emergencia local (108 / 112) o su médico tratante."
    };
    return {
      success: true,
      reply: safetyReplies[lang] || safetyReplies.en,
      intent: 'MEDICAL_SAFETY',
      language: lang
    };
  }

  // Intent Detection
  let intent = 'GENERAL_HELP';
  if (q.includes('status') || q.includes('my request') || q.includes('track') || q.includes('स्थिति') || q.includes('ਸਥਿਤੀ') || q.includes('স্ট্যাটাস') || q.includes('estado')) {
    intent = 'REQUEST_STATUS';
  } else if (q.includes('available') || q.includes('stock') || q.includes('inventory') || q.includes('उपलब्ध') || q.includes('ਸਟਾਕ') || q.includes('স্টক') || q.includes('disponible')) {
    intent = 'BLOOD_AVAILABILITY';
  } else if (q.includes('eligible') || q.includes('donor') || q.includes('donate') || q.includes('weight') || q.includes('cooldown') || q.includes('पात्र') || q.includes('ਦਾਨ') || q.includes('দান') || q.includes('donar')) {
    intent = 'DONOR_ELIGIBILITY';
  } else if (q.includes('thalassemia') || q.includes('recurring') || q.includes('schedule') || q.includes('थैलेसीमिया') || q.includes('ਥੈਲੇਸੀਮੀਆ') || q.includes('থ্যালাসেমিয়া') || q.includes('talasemia')) {
    intent = 'THALASSEMIA_INFO';
  } else if (q.includes('create') || q.includes('how to request') || q.includes('prescription') || q.includes('upload') || q.includes('अनुरोध') || q.includes('ਬੇਨਤੀ') || q.includes('অনুরোধ') || q.includes('solicitar')) {
    intent = 'CREATE_REQUEST';
  }

  // Response Generator based on Intent and Language
  let replyText = '';

  if (intent === 'REQUEST_STATUS') {
    if (userRequests.length > 0) {
      const latest = userRequests[0];
      const details = `Req #${latest.requestNumber}: ${latest.bloodGroup} (${latest.unitsRequired} units) at ${latest.hospitalName}. Status: [${latest.status}]. Emergency Level: ${latest.emergencyLevel}.`;

      const statusMap = {
        en: `📋 **Your Latest Blood Request Context**:\n- ${details}\n- You can view full radar & match logs under 'My Requests'.`,
        hi: `📋 **आपके नवीनतम रक्त अनुरोध की स्थिति**:\n- ${details}\n- आप 'My Requests' पेज पर पूरा लाइव मैप देख सकते हैं।`,
        pa: `📋 **ਤੁਹਾਡੀ ਤਾਜ਼ਾ ਬਲੱਡ ਬੇਨਤੀ ਦੀ ਸਥਿਤੀ**:\n- ${details}\n- ਤੁਸੀਂ 'My Requests' ਪੇਜ 'ਤੇ ਪੂਰਾ ਲਾਈਵ ਮੈਪ ਦੇਖ ਸਕਦੇ ਹੋ।`,
        bn: `📋 **আপনার সাম্প্রতিক রক্ত অনুরোধের অবস্থা**:\n- ${details}\n- বিস্তারিত দেখতে 'My Requests' মেনুতে যান।`,
        es: `📋 **Estado de su última solicitud de sangre**:\n- ${details}\n- Puede consultar el mapa interactivo en 'Mis Solicitudes'.`
      };
      replyText = statusMap[lang] || statusMap.en;
    } else {
      const noReqMap = {
        en: "ℹ️ You currently have no active emergency blood requests. To create one, click **'Request Blood'** on the top menu.",
        hi: "ℹ️ आपके पास वर्तमान में कोई सक्रिय रक्त अनुरोध नहीं है। नया अनुरोध दर्ज करने के लिए ऊपर **'Request Blood'** पर क्लिक करें।",
        pa: "ℹ️ ਤੁਹਾਡੇ ਕੋਲ ਵਰਤਮਾਨ ਵਿੱਚ ਕੋਈ ਸਰਗਰਮ ਬਲੱਡ ਬੇਨਤੀ ਨਹੀਂ ਹੈ। ਨਵੀਂ ਬੇਨਤੀ ਲਈ **'Request Blood'** 'ਤੇ ਕਲਿੱਕ ਕਰੋ।",
        bn: "ℹ️ আপনার বর্তমানে কোনো সক্রিয় রক্ত অনুরোধ নেই। নতুন অনুরোধের জন্য **'Request Blood'** ক্লিক করুন।",
        es: "ℹ️ Actualmente no tiene ninguna solicitud de sangre activa. Para crear una, haga clic en **'Solicitar Sangre'**."
      };
      replyText = noReqMap[lang] || noReqMap.en;
    }
  } else if (intent === 'BLOOD_AVAILABILITY') {
    if (inventories.length > 0) {
      const stockSummary = inventories.slice(0, 4).map(i => `${i.bloodGroup}: ${i.availableUnits} units available`).join(', ');
      const availMap = {
        en: `🩸 **Real-Time Live Stock Snapshot**:\n- ${stockSummary}\n- Check the full list and map under **'Live Availability'**.`,
        hi: `🩸 **वास्तविक समय रक्त स्टॉक**:\n- ${stockSummary}\n- पूरा लाइव स्टॉक देखने के लिए **'Live Availability'** पेज देखें।`,
        pa: `🩸 **ਲਾਈਵ ਬਲੱਡ ਸਟਾਕ**:\n- ${stockSummary}\n- ਪੂਰਾ ਸਟਾਕ ਦੇਖਣ ਲਈ **'Live Availability'** 'ਤੇ ਜਾਓ।`,
        bn: `🩸 **লাইভ রক্ত স্টক সংক্রান্ত তথ্য**:\n- ${stockSummary}\n- বিস্তারিত তথ্যের জন্য **'Live Availability'** ক্লিক করুন।`,
        es: `🩸 **Inventario en Tiempo Real**:\n- ${stockSummary}\n- Verifique la disponibilidad completa en la pestaña **'Disponibilidad En Vivo'**.`
      };
      replyText = availMap[lang] || availMap.en;
    } else {
      const genAvailMap = {
        en: "🩸 You can check live blood availability across regional blood banks on the **'Live Availability'** page with filtering by blood group and city.",
        hi: "🩸 आप **'Live Availability'** पेज पर रक्त समूह और शहर के अनुसार फ़िल्टर करके लाइव स्टॉक की जांच कर सकते हैं।",
        pa: "🩸 ਤੁਸੀਂ **'Live Availability'** ਪੇਜ 'ਤੇ ਬਲੱਡ ਗਰੁੱਪ ਅਤੇ ਸ਼ਹਿਰ ਦੁਆਰਾ ਲਾਈਵ ਸਟਾਕ ਦੀ ਜਾਂਚ ਕਰ ਸਕਦੇ ਹੋ।",
        bn: "🩸 আপনি **'Live Availability'** পৃষ্ঠায় ব্লাড গ্রুপ এবং শহর অনুযায়ী ফিল্টার করে স্টক পরীক্ষা করতে পারেন।",
        es: "🩸 Puede consultar el inventario de sangre en la página **'Disponibilidad En Vivo'** filtrando por grupo sanguíneo y ciudad."
      };
      replyText = genAvailMap[lang] || genAvailMap.en;
    }
  } else if (intent === 'DONOR_ELIGIBILITY') {
    const elMap = {
      en: "❤️ **Volunteer Donor Eligibility Criteria**:\n1. Minimum Weight: **45 kg**\n2. Age: 18 - 65 years\n3. Mandatory Donation Cooldown: **90 days**\n4. Absence of severe chronic health conditions\n- Check and update your status in **'Donor Hub'**.",
      hi: "❤️ **रक्तदान पात्रता मानदंड**:\n1. न्यूनतम वजन: **45 किलो**\n2. आयु: 18 - 65 वर्ष\n3. रक्तदान के बीच अनिवार्य अंतर: **90 दिन**\n4. कोई गंभीर पुरानी बीमारी न हो\n- **'Donor Hub'** में अपनी पात्रता स्थिति अपडेट करें।",
      pa: "❤️ **ਖੂਨ ਦਾਨ ਕਰਨ ਦੀ ਯੋਗਤਾ**:\n1. ਘੱਟੋ-ਘੱਟ ਵਜ਼ਨ: **45 ਕਿਲੋ**\n2. ਉਮਰ: 18 - 65 ਸਾਲ\n3. ਦਾਨ ਦੇ ਵਿਚਕਾਰ ਸਮਾਂ: **90 ਦਿਨ**\n- **'Donor Hub'** ਵਿੱਚ ਆਪਣੀ ਸਥਿਤੀ ਅਪਡੇਟ ਕਰੋ।",
      bn: "❤️ **রক্তদানের যোগ্যতা নির্দেশিকা**:\n1. সর্বনিম্ন ওজন: **৪৫ কেজি**\n2. বয়স: ১৮ - ৬৫ বছর\n3. বাধ্যতামূলক বিরতি: **৯০ দিন**\n- **'Donor Hub'** মেনুতে গিয়ে নিজের যোগ্যতা আপডেট করুন।",
      es: "❤️ **Requisitos para Donantes Voluntarios**:\n1. Peso Mínimo: **45 kg**\n2. Edad: 18 - 65 años\n3. Periodo de recuperación entre donaciones: **90 días**\n- Actualice su estado en el **'Panel de Donantes'**."
    };
    replyText = elMap[lang] || elMap.en;
  } else if (intent === 'THALASSEMIA_INFO') {
    const thalMap = {
      en: "🗓️ **Thalassemia Recurring Care Feature**:\n- Allows families to configure recurring transfusion cycles (e.g. every 21 days).\n- Automated countdown reminders alert you before the scheduled date.\n- 1-click conversion to create an active emergency request in advance.\n- Access under **'Thalassemia Care'**.",
      hi: "🗓️ **थैलेसीमिया आवर्ती देखभाल सुविधा**:\n- आवर्ती आधान चक्र (जैसे हर 21 दिन) कॉन्फ़िगर करें।\n- नियत तारीख से पहले स्वचालित उलटी गिनती रिमाइंडर प्राप्त करें।\n- समय से पहले अनुरोध में बदलने के लिए 1-क्लिक बटन उपयोग करें।\n- **'Thalassemia Care'** पेज पर जाएँ।",
      pa: "🗓️ **ਥੈਲੇਸੀਮੀਆ ਕੇਅਰ ਫੀਚਰ**:\n- ਹਰ 21 ਦਿਨਾਂ ਬਾਅਦ ਬਲੱਡ ਟ੍ਰਾਂਸਫਿਊਜ਼ਨ ਸ਼ੈਡਿਊਲ ਸੈੱਟ ਕਰੋ।\n- ਮਿਤੀ ਤੋਂ ਪਹਿਲਾਂ ਆਟੋਮੈਟਿਕ ਰੀਮਾਈਂਡਰ ਪ੍ਰਾਪਤ ਕਰੋ।\n- **'Thalassemia Care'** 'ਤੇ ਜਾਓ।",
      bn: "🗓️ **থ্যালাসেমিয়া যত্ন ফিচার**:\n- নিয়মিত রক্ত সঞ্চালন চক্র (যেমন প্রতি ২১ দিন) কনফিগার করুন।\n- নির্ধারিত তারিখের আগে কাউন্টডাউন রিমাইন্ডার পাবেন।\n- বিস্তারিত তথ্যের জন্য **'Thalassemia Care'** অপশনে যান।",
      es: "🗓️ **Atención Recurrente para Talasemia**:\n- Configure ciclos de transfusión recurrentes (ej. cada 21 días).\n- Reciba recordatorios automáticos de cuenta regresiva antes de la fecha programada.\n- Acceda a través de **'Atención de Talasemia'**."
    };
    replyText = thalMap[lang] || thalMap.en;
  } else if (intent === 'CREATE_REQUEST') {
    const reqMap = {
      en: "📝 **How to Request Emergency Blood**:\n1. Go to **'Request Blood'** page.\n2. Enter patient details, required units, and hospital address.\n3. Upload medical prescription/requisition documents (PDF, JPG, PNG).\n4. Our AI priority classifier will immediately evaluate urgency and match compatible stock/donors.",
      hi: "📝 **आपातकालीन रक्त अनुरोध कैसे दर्ज करें**:\n1. **'Request Blood'** पेज पर जाएं।\n2. रोगी का विवरण, आवश्यक यूनिट और अस्पताल का पता दर्ज करें।\n3. डॉक्टर का पर्चा / प्रिस्क्रिप्शन अपलोड करें (PDF, JPG, PNG)।\n4. हमारा AI सिस्टम तुरंत प्राथमिकता तय करेगा और मैचिंग शुरू करेगा।",
      pa: "📝 **ਐਮਰਜੈਂਸੀ ਬਲੱਡ ਬੇਨਤੀ ਕਿਵੇਂ ਦਰਜ ਕਰਨੀ ਹੈ**:\n1. **'Request Blood'** ਪੇਜ 'ਤੇ ਜਾਓ।\n2. ਮਰੀਜ਼ ਦਾ ਵੇਰਵਾ ਅਤੇ ਹਸਪਤਾਲ ਦਾ ਪਤਾ ਭਰੋ।\n3. ਡਾਕਟਰ ਦਾ ਪ੍ਰਿਸਕ੍ਰਿਪਸ਼ਨ ਅੱਪਲੋਡ ਕਰੋ।\n4. ਸਾਡਾ AI ਸਿਸਟਮ ਤੁਰੰਤ ਮੈਚਿੰਗ ਸ਼ੁਰੂ ਕਰੇਗਾ।",
      bn: "📝 **জরুরী রক্তের অনুরোধ প্রক্রিয়া**:\n1. **'Request Blood'** মেনুতে যান।\n2. রোগীর বিবরণ এবং হাসপাতালের ঠিকানা লিখুন।\n3. ডাক্তারের প্রেসক্রিপশন আপলোড করুন (PDF, JPG, PNG)।\n4. আমাদের AI সিস্টেম অবিলম্বে ম্যাচিং শুরু করবে।",
      es: "📝 **Cómo Crear una Solicitud de Emergencia**:\n1. Ingrese a la sección **'Solicitar Sangre'**.\n2. Complete los datos del paciente y la dirección del hospital.\n3. Adjunte la receta o prescripción médica (PDF, JPG, PNG).\n4. Nuestro sistema de IA clasificará la urgencia y buscará donantes/bancos compatibles."
    };
    replyText = reqMap[lang] || reqMap.en;
  } else {
    const generalMap = {
      en: "🤖 Hello! I am your **RaktSaarthi Smart AI Assistant**.\nI can assist you with:\n- Checking emergency blood request status\n- Live blood availability & stock matching\n- Donor eligibility & 90-day recovery calculations\n- Thalassemia recurring transfusion schedules\n- Platform navigation & hospital coordination workflow.",
      hi: "🤖 नमस्ते! मैं आपका **रक्तसारथी स्मार्ट AI सहायक** हूँ।\nमैं आपकी सहायता कर सकता हूँ:\n- आपातकालीन रक्त अनुरोध की स्थिति जांचने में\n- लाइव रक्त स्टॉक और मैचिंग में\n- रक्तदान की पात्रता जानकारी में\n- थैलेसीमिया देखभाल और शेड्यूलिंग में",
      pa: "🤖 ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ! ਮੈਂ ਤੁਹਾਡਾ **ਰਕਤਸਾਰਥੀ AI ਸਹਾਇਕ** ਹਾਂ।\nਮੈਂ ਬਲੱਡ ਬੇਨਤੀਆਂ, ਲਾਈਵ ਸਟਾਕ ਅਤੇ ਖੂਨ ਦਾਨ ਦੀ ਯੋਗਤਾ ਵਿੱਚ ਤੁਹਾਡੀ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ।",
      bn: "🤖 হ্যালো! আমি আপনার **রক্তসারথী স্মার্ট AI সহকারী**।\nআমি আপনাকে রক্তের অনুরোধের অবস্থা, লাইভ স্টক এবং রক্তদানের যোগ্যতার তথ্যে সাহায্য করতে পারি।",
      es: "🤖 ¡Hola! Soy su **Asistente Inteligente de RaktSaarthi**.\nPuedo ayudarle a consultar solicitudes de sangre, disponibilidad en vivo, requisitos para donantes y cuidados de talasemia."
    };
    replyText = generalMap[lang] || generalMap.en;
  }

  return {
    success: true,
    reply: replyText,
    intent,
    language: lang
  };
};

module.exports = {
  findMatches,
  predictEmergencyPriority,
  predictDemand,
  calculateThalassemiaReminder,
  generateCoordinationRecommendation,
  processMultilingualChat
};

