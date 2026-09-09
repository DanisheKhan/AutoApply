/**
 * Field Heuristics and Pattern Matchers for AutoApply Pro
 * Maps DOM input attributes (name, id, placeholder, aria-label, label text) to candidate profile values.
 */

const FIELD_PATTERNS = [
  // --- Personal Identity ---
  {
    key: "personal.fullName",
    regex: /\b(full[_\s-]?name|candidate[_\s-]?name|name|your[_\s-]?name|applicant[_\s-]?name)\b/i,
    exclude: /first|last|middle|user|company|school|college|file|father|mother/i,
    getValue: (p) => p.personal.fullName
  },
  {
    key: "personal.firstName",
    regex: /\b(first[_\s-]?name|fname|given[_\s-]?name|forename)\b/i,
    getValue: (p) => p.personal.firstName
  },
  {
    key: "personal.lastName",
    regex: /\b(last[_\s-]?name|lname|surname|family[_\s-]?name)\b/i,
    getValue: (p) => p.personal.lastName
  },
  {
    key: "personal.email",
    regex: /\b(e?mail|email[_\s-]?address|contact[_\s-]?email)\b/i,
    getValue: (p) => p.personal.email
  },
  {
    key: "personal.phone",
    regex: /\b(phone|mobile|cell|contact[_\s-]?no|phone[_\s-]?number|mobile[_\s-]?number|telephone)\b/i,
    exclude: /alternate|alt/i,
    getValue: (p) => p.personal.phonePlain || p.personal.phone
  },
  {
    key: "personal.fatherName",
    regex: /\b(father[_\s-]?name|father|guardian[_\s-]?name)\b/i,
    getValue: (p) => p.personal.fatherName
  },
  {
    key: "personal.motherName",
    regex: /\b(mother[_\s-]?name|mother)\b/i,
    getValue: (p) => p.personal.motherName
  },
  {
    key: "personal.dob",
    regex: /\b(dob|birth[_\s-]?date|date[_\s-]?of[_\s-]?birth)\b/i,
    getValue: (p, el) => {
      // If HTML5 type="date", return YYYY-MM-DD, else DD/MM/YYYY
      if (el && el.type === "date") return p.personal.dob;
      return p.personal.dobFormatted;
    }
  },
  {
    key: "personal.gender",
    regex: /\b(gender|sex)\b/i,
    getValue: (p) => p.personal.gender
  },
  {
    key: "personal.nationality",
    regex: /\b(nationality|citizenship)\b/i,
    getValue: (p) => p.personal.nationality
  },
  {
    key: "personal.religion",
    regex: /\b(religion)\b/i,
    getValue: (p) => p.personal.religion
  },
  {
    key: "personal.casteCategory",
    regex: /\b(category|caste|quota|reservation)\b/i,
    getValue: (p) => p.personal.casteCategory
  },

  // --- Civil & Identity Numbers (TCS, Infosys, Indian Enterprise) ---
  {
    key: "identification.panNumber",
    regex: /\b(pan|pan[_\s-]?card|pan[_\s-]?number|pan[_\s-]?no)\b/i,
    getValue: (p) => p.identification.panNumber
  },
  {
    key: "identification.aadhaarNumber",
    regex: /\b(aadhaar|aadhar|uidai|adhaar[_\s-]?no|aadhaar[_\s-]?number)\b/i,
    getValue: (p) => p.identification.aadhaarNumber
  },
  {
    key: "identification.passportNumber",
    regex: /\b(passport[_\s-]?no|passport[_\s-]?number|passport)\b/i,
    getValue: (p) => p.identification.passportNumber
  },

  // --- Portal & Account Password ---
  {
    key: "credentials.password",
    regex: /\b(password|passwd|pwd|passcode|portal[_\s-]?password|create[_\s-]?password|set[_\s-]?password|new[_\s-]?password)\b/i,
    exclude: /confirm|re[_\s-]?enter|repeat|verify|again|old|current/i,
    getValue: (p) => p.credentials?.defaultPassword || p.personal?.password || "Danishe@1257"
  },
  {
    key: "credentials.confirmPassword",
    regex: /\b(confirm[_\s-]?password|re[_\s-]?enter[_\s-]?password|repeat[_\s-]?password|verify[_\s-]?password|password[_\s-]?confirmation)\b/i,
    getValue: (p) => p.credentials?.defaultPassword || p.personal?.password || "Danishe@1257"
  },

  // --- Location & Address ---
  {
    key: "address.pincode",
    regex: /\b(pin|pincode|postal[_\s-]?code|zip|zip[_\s-]?code)\b/i,
    getValue: (p) => p.address.pincode
  },
  {
    key: "address.city",
    regex: /\b(city|town|district)\b/i,
    exclude: /state|country|address/i,
    getValue: (p) => p.address.city
  },
  {
    key: "address.state",
    regex: /\b(state|province|region)\b/i,
    getValue: (p) => p.address.state
  },
  {
    key: "address.country",
    regex: /\b(country)\b/i,
    getValue: (p) => p.address.country
  },
  {
    key: "address.fullAddress",
    regex: /\b(address|street[_\s-]?address|residential[_\s-]?address|permanent[_\s-]?address|current[_\s-]?address)\b/i,
    exclude: /email|mac|ip|state|city|pin/i,
    getValue: (p) => p.address.fullAddress
  },

  // --- Social Links & Profiles ---
  {
    key: "links.linkedin",
    regex: /\b(linkedin|linkedin[_\s-]?profile|linkedin[_\s-]?url)\b/i,
    getValue: (p) => p.links.linkedin
  },
  {
    key: "links.github",
    regex: /\b(github|github[_\s-]?profile|github[_\s-]?url)\b/i,
    getValue: (p) => p.links.github
  },
  {
    key: "links.portfolio",
    regex: /\b(portfolio|website|personal[_\s-]?website|web[_\s-]?site|blog)\b/i,
    exclude: /company|linkedin|github/i,
    getValue: (p) => p.links.portfolio
  },

  // --- 10th Standard / Secondary School (SSC) ---
  {
    key: "academics.tenth.percentage",
    regex: /\b(10th[_\s-]?%|10th[_\s-]?percentage|ssc[_\s-]?%|ssc[_\s-]?percentage|secondary[_\s-]?percentage|10th[_\s-]?marks[_\s-]?%)\b/i,
    getValue: (p) => p.academics.tenth.percentage
  },
  {
    key: "academics.tenth.schoolName",
    regex: /\b(10th[_\s-]?school|ssc[_\s-]?school|secondary[_\s-]?school)\b/i,
    getValue: (p) => p.academics.tenth.schoolName
  },
  {
    key: "academics.tenth.board",
    regex: /\b(10th[_\s-]?board|ssc[_\s-]?board|secondary[_\s-]?board)\b/i,
    getValue: (p) => p.academics.tenth.board
  },
  {
    key: "academics.tenth.passingYear",
    regex: /\b(10th[_\s-]?passing[_\s-]?year|10th[_\s-]?year|ssc[_\s-]?year)\b/i,
    getValue: (p) => p.academics.tenth.passingYear
  },

  // --- 12th Standard / HSC / Diploma ---
  {
    key: "academics.twelfth.percentage",
    regex: /\b(12th[_\s-]?%|12th[_\s-]?percentage|hsc[_\s-]?%|hsc[_\s-]?percentage|higher[_\s-]?secondary[_\s-]?percentage|diploma[_\s-]?%)\b/i,
    getValue: (p) => p.academics.twelfth.percentage
  },
  {
    key: "academics.twelfth.collegeName",
    regex: /\b(12th[_\s-]?college|hsc[_\s-]?college|junior[_\s-]?college)\b/i,
    getValue: (p) => p.academics.twelfth.collegeName
  },
  {
    key: "academics.twelfth.board",
    regex: /\b(12th[_\s-]?board|hsc[_\s-]?board)\b/i,
    getValue: (p) => p.academics.twelfth.board
  },
  {
    key: "academics.twelfth.passingYear",
    regex: /\b(12th[_\s-]?passing[_\s-]?year|12th[_\s-]?year|hsc[_\s-]?year)\b/i,
    getValue: (p) => p.academics.twelfth.passingYear
  },

  // --- Graduation / Undergrad (B.Tech) ---
  {
    key: "academics.graduation.cgpa",
    regex: /\b(cgpa|gpa|grade[_\s-]?point|cumulative[_\s-]?gpa|b\.?tech[_\s-]?cgpa|degree[_\s-]?cgpa)\b/i,
    getValue: (p) => p.academics.graduation.cgpa
  },
  {
    key: "academics.graduation.collegeName",
    regex: /\b(college|university|institution|school|institute)\b/i,
    exclude: /10th|12th|high[_\s-]?school|junior/i,
    getValue: (p) => p.academics.graduation.collegeName
  },
  {
    key: "academics.graduation.degree",
    regex: /\b(degree|qualification|graduation|course|highest[_\s-]?qualification|highest[_\s-]?degree|education[_\s-]?level)\b/i,
    getValue: (p) => p.academics?.graduation?.degree || "B.Tech"
  },
  {
    key: "academics.graduation.branch",
    regex: /\b(branch|major|field[_\s-]?of[_\s-]?study|specialization|discipline)\b/i,
    getValue: (p) => p.academics.graduation.branch
  },
  {
    key: "academics.graduation.passingYear",
    regex: /\b(graduation[_\s-]?year|year[_\s-]?of[_\s-]?graduation|passing[_\s-]?year|batch|grad[_\s-]?year)\b/i,
    exclude: /10th|12th/i,
    getValue: (p) => p.academics.graduation.passingYear
  },
  {
    key: "academics.graduation.backlogs",
    regex: /\b(backlogs?|active[_\s-]?backlogs?|arrears?|live[_\s-]?backlogs?|standing[_\s-]?arrears?)\b/i,
    getValue: (p) => p.academics.graduation.activeBacklogs
  },
  {
    key: "academics.graduation.prnNumber",
    regex: /\b(prn|prn[_\s-]?no|roll[_\s-]?no|registration[_\s-]?no|student[_\s-]?id)\b/i,
    getValue: (p) => p.academics.graduation.prnNumber
  },

  // --- Career, CTC & Experience (LinkedIn, Naukri, Consultancies) ---
  {
    key: "career.currentCompany",
    regex: /\b(current[_\s-]?company|present[_\s-]?company|employer)\b/i,
    getValue: (p) => p.career.currentCompany
  },
  {
    key: "career.currentRole",
    regex: /\b(current[_\s-]?title|current[_\s-]?role|job[_\s-]?title|designation)\b/i,
    getValue: (p) => p.career.currentRole
  },
  {
    key: "career.totalExperienceYears",
    regex: /\b(total[_\s-]?experience|years[_\s-]?of[_\s-]?experience|experience[_\s-]?in[_\s-]?years|overall[_\s-]?experience)\b/i,
    getValue: (p) => p.career.totalExperienceYears
  },
  {
    key: "career.currentCtc",
    regex: /\b(current[_\s-]?ctc|present[_\s-]?ctc|current[_\s-]?salary|fixed[_\s-]?ctc)\b/i,
    getValue: (p) => p.career.currentCtcLpa
  },
  {
    key: "career.expectedCtc",
    regex: /\b(expected[_\s-]?ctc|desired[_\s-]?ctc|expected[_\s-]?salary|salary[_\s-]?expectation)\b/i,
    getValue: (p) => p.career.expectedCtcLpa
  },
  {
    key: "career.noticePeriod",
    regex: /\b(notice[_\s-]?period|how[_\s-]?soon[_\s-]?can[_\s-]?you[_\s-]?join|availability|joining[_\s-]?time)\b/i,
    getValue: (p) => p.career.noticePeriodDays
  },

  // --- Work Authorization & Demographics ---
  {
    key: "career.workAuthIndia",
    regex: /\b(legally[_\s-]?authorized.*india|authorized[_\s-]?to[_\s-]?work.*india|work[_\s-]?permit.*india)\b/i,
    getValue: (p) => p.career.workAuthorizationIndia
  },
  {
    key: "career.sponsorshipIndia",
    regex: /\b(sponsorship.*india|require[_\s-]?visa.*india)\b/i,
    getValue: (p) => p.career.requiresSponsorshipIndia
  },
  {
    key: "career.veteranStatus",
    regex: /\b(veteran[_\s-]?status|protected[_\s-]?veteran|armed[_\s-]?forces)\b/i,
    getValue: (p) => p.career.veteranStatus
  },
  {
    key: "career.disabilityStatus",
    regex: /\b(disability|handicapped|pwd[_\s-]?status)\b/i,
    getValue: (p) => p.career.disabilityStatus
  }
];

/**
 * Checks whether an element or label indicates an open-ended essay question suitable for Gemini AI.
 * @param {string} text - The label or question text.
 * @returns {boolean}
 */
function isOpenEndedQuestion(text) {
  if (!text || text.length < 10) return false;
  return /\b(why|describe|explain|tell us|what makes|biggest|accomplishment|challenge|project|experience with|motivation|strength|weakness|interests|cover letter|additional information)\b/i.test(text);
}

if (typeof window !== 'undefined') {
  window.FIELD_PATTERNS = FIELD_PATTERNS;
  window.isOpenEndedQuestion = isOpenEndedQuestion;
}
if (typeof self !== 'undefined') {
  self.FIELD_PATTERNS = FIELD_PATTERNS;
  self.isOpenEndedQuestion = isOpenEndedQuestion;
}
