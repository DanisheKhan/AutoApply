/**
 * Field Heuristics and Pattern Matchers for AutoApply Pro
 * Maps DOM input attributes (name, id, placeholder, aria-label, label text, surrounding text) to candidate profile values.
 * Covers 50+ enterprise recruitment categories and subtle edge cases.
 */

const FIELD_PATTERNS = [
  // --- Personal Identity ---
  {
    key: "personal.fullName",
    regex: /\b(full[_\s-]?name|candidate[_\s-]?name|applicant[_\s-]?name|your[_\s-]?name|complete[_\s-]?name|name[_\s-]?as[_\s-]?per[_\s-]?aadhaar|name[_\s-]?in[_\s-]?full)\b/i,
    exclude: /first|last|middle|user|company|school|college|file|father|mother|guardian|spouse|emergency|reference|referee|manager|vendor/i,
    getValue: (p) => p.personal?.fullName || p.personal?.certificateName || "Mohammad Danish Khan"
  },
  {
    key: "personal.certificateName",
    regex: /\b(certificate[_\s-]?name|name[_\s-]?on[_\s-]?marksheet|name[_\s-]?on[_\s-]?degree|official[_\s-]?name)\b/i,
    getValue: (p) => p.personal?.certificateName || p.personal?.fullName || "Mohammad Danish Khan"
  },
  {
    key: "personal.shortName",
    regex: /\b(short[_\s-]?name|preferred[_\s-]?name|nickname|display[_\s-]?name|known[_\s-]?as)\b/i,
    getValue: (p) => p.personal?.shortName || p.personal?.firstName || "Danish Khan"
  },
  {
    key: "personal.salutation",
    regex: /\b(salutation|title|prefix|honorific)\b/i,
    exclude: /job[_\s-]?title|position[_\s-]?title|degree[_\s-]?title/i,
    getValue: () => "Mr."
  },
  {
    key: "personal.firstName",
    regex: /\b(first[_\s-]?name|fname|given[_\s-]?name|forename|applicant[_\s-]?first[_\s-]?name)\b/i,
    getValue: (p, el) => {
      // Smart detection: if surrounding form/container contains a middle name field, return 3-field first name ("Mohammad Danish")
      if (el && typeof document !== 'undefined') {
        const formOrContainer = (typeof el.closest === 'function')
          ? (el.closest('form') || el.closest('[role="form"]') || el.closest('.form-card') || el.parentElement?.parentElement)
          : null;
        if (formOrContainer) {
          const hasMiddle = formOrContainer.querySelector?.('input[name*="middle" i], input[id*="middle" i], input[placeholder*="middle" i], input[aria-label*="middle" i]') ||
            Array.from(formOrContainer.querySelectorAll?.('label, div') || []).some(l => /\bmiddle[_\s-]?name\b/i.test(l.textContent || ''));
          if (hasMiddle) {
            return p.personal?.firstName3Field || "Mohammad Danish";
          }
        }
      }
      return p.personal?.firstName2Field || p.personal?.firstName || "Mohammad Danish Khan";
    }
  },
  {
    key: "personal.middleName",
    regex: /\b(middle[_\s-]?name|mname|second[_\s-]?name)\b/i,
    getValue: (p) => p.personal?.middleName || "Khan"
  },
  {
    key: "personal.lastName",
    regex: /\b(last[_\s-]?name|lname|surname|family[_\s-]?name|applicant[_\s-]?last[_\s-]?name)\b/i,
    getValue: (p) => p.personal?.lastName || "Naeem Khan"
  },
  {
    key: "personal.email",
    regex: /\b(e?mail|email[_\s-]?address|contact[_\s-]?email|primary[_\s-]?email|applicant[_\s-]?email)\b/i,
    exclude: /secondary|alternate|referral|company[_\s-]?email/i,
    getValue: (p) => p.personal?.email || "danishkhan.jsx@gmail.com"
  },
  {
    key: "personal.phoneCountryCode",
    regex: /\b(country[_\s-]?code|isd[_\s-]?code|dial[_\s-]?code|phone[_\s-]?code)\b/i,
    getValue: () => "+91"
  },
  {
    key: "personal.phone",
    regex: /\b(phone|mobile|cell|contact([_\s-]?no|[_\s-]?number)?|phone[_\s-]?number|mobile[_\s-]?number|telephone|cellphone|primary[_\s-]?mobile|whatsapp[_\s-]?no)\b/i,
    exclude: /alternate|alt|emergency|guardian|father|mother|reference/i,
    getValue: (p, el) => {
      // If field accepts max 10 chars or has standard Indian 10-digit placeholder, return 10-digit
      const maxLen = el?.maxLength || (typeof el?.getAttribute === 'function' ? el.getAttribute('maxlength') : null);
      const ph = typeof el?.placeholder === 'string' ? el.placeholder : '';
      if (maxLen === 10 || maxLen === '10' || /10[_\s-]?digit/i.test(ph)) {
        return p.personal?.phonePlain || "9322990946";
      }
      return p.personal?.phonePlain || p.personal?.phone || "9322990946";
    }
  },
  {
    key: "personal.phoneWithCode",
    regex: /\b(phone[_\s-]?with[_\s-]?country[_\s-]?code|international[_\s-]?format[_\s-]?phone|mobile[_\s-]?\(\+91\))\b/i,
    getValue: (p) => p.personal?.phone || "+919322990946"
  },
  {
    key: "personal.fatherName",
    regex: /\b(father[_\s-]?name|father|guardian[_\s-]?name|parent[_\s-]?name)\b/i,
    exclude: /mother/i,
    getValue: (p) => p.personal?.fatherName || "Naeem Khan"
  },
  {
    key: "personal.motherName",
    regex: /\b(mother[_\s-]?name|mother)\b/i,
    exclude: /tongue/i,
    getValue: (p) => p.personal?.motherName || "Yasmeen Bano"
  },
  {
    key: "personal.dob",
    regex: /\b(dob|birth[_\s-]?date|date[_\s-]?of[_\s-]?birth|birthday|applicant[_\s-]?dob)\b/i,
    getValue: (p, el) => {
      if (el && el.type === "date") return p.personal?.dob || "2005-06-01";
      const ph = (el && el.placeholder ? el.placeholder.toLowerCase() : "");
      if (ph.includes("yyyy-mm-dd") || ph.includes("yyyy/mm/dd")) return p.personal?.dob || "2005-06-01";
      if (ph.includes("mm/dd/yyyy")) return "06/01/2005";
      return p.personal?.dobFormatted || "01/06/2005";
    }
  },
  {
    key: "personal.dobDay",
    regex: /\b(birth[_\s-]?day|dob[_\s-]?day|date[_\s-]?of[_\s-]?birth[_\s-]?day|day[_\s-]?\(dob\))\b/i,
    getValue: () => "01"
  },
  {
    key: "personal.dobMonth",
    regex: /\b(birth[_\s-]?month|dob[_\s-]?month|date[_\s-]?of[_\s-]?birth[_\s-]?month|month[_\s-]?\(dob\))\b/i,
    getValue: () => "06"
  },
  {
    key: "personal.dobYear",
    regex: /\b(birth[_\s-]?year|dob[_\s-]?year|date[_\s-]?of[_\s-]?birth[_\s-]?year|year[_\s-]?\(dob\))\b/i,
    getValue: () => "2005"
  },
  {
    key: "personal.gender",
    regex: /\b(gender|sex)\b/i,
    getValue: (p) => p.personal?.gender || "Male"
  },
  {
    key: "personal.bloodGroup",
    regex: /\b(blood[_\s-]?group|blood[_\s-]?type)\b/i,
    getValue: (p) => p.personal?.bloodGroup || "AB+"
  },
  {
    key: "personal.nationality",
    regex: /\b(nationality|citizenship|country[_\s-]?of[_\s-]?citizenship)\b/i,
    getValue: (p) => p.personal?.nationality || "Indian"
  },
  {
    key: "personal.motherTongue",
    regex: /\b(mother[_\s-]?tongue|native[_\s-]?language|first[_\s-]?language)\b/i,
    getValue: (p) => p.personal?.motherTongue || "Urdu"
  },
  {
    key: "personal.religion",
    regex: /\b(religion|religious[_\s-]?faith)\b/i,
    getValue: (p) => p.personal?.religion || "Islam"
  },
  {
    key: "personal.casteCategory",
    regex: /\b(caste|category|reservation[_\s-]?category|quota|social[_\s-]?category)\b/i,
    getValue: (p) => p.personal?.casteCategory || "General / Open / EWS"
  },
  {
    key: "personal.minorityStatus",
    regex: /\b(minority|minority[_\s-]?status|belong[_\s-]?to[_\s-]?minority)\b/i,
    getValue: (p) => p.personal?.minorityStatus || "Yes"
  },
  {
    key: "personal.maritalStatus",
    regex: /\b(marital[_\s-]?status|marital|marriage[_\s-]?status)\b/i,
    getValue: () => "Single / Unmarried"
  },
  {
    key: "personal.headline",
    regex: /\b(headline|professional[_\s-]?headline|tagline|summary[_\s-]?title|profile[_\s-]?title)\b/i,
    getValue: (p) => p.personal?.headline || "Full-Stack Web Developer | React, Node.js, Express, MongoDB, Supabase, Java DSA"
  },

  // --- Civil & Identity Numbers (TCS, Infosys, Indian Enterprise) ---
  {
    key: "identification.panNumber",
    regex: /\b(pan|pan[_\s-]?card|pan[_\s-]?number|pan[_\s-]?no|permanent[_\s-]?account[_\s-]?number)\b/i,
    getValue: (p) => p.identification?.panNumber || "NNPPK5977P"
  },
  {
    key: "identification.aadhaarNumber",
    regex: /\b(aadhaar|aadhar|uidai|adhaar[_\s-]?no|aadhaar[_\s-]?number|aadhaar[_\s-]?card)\b/i,
    getValue: (p, el) => {
      const ph = (el && el.placeholder ? el.placeholder : "");
      if (ph.includes(" ") || ph.includes("-")) {
        return p.identification?.aadhaarFormatted || "2708 8362 2036";
      }
      return p.identification?.aadhaarNumber || "270883622036";
    }
  },
  {
    key: "identification.passportNumber",
    regex: /\b(passport[_\s-]?no|passport[_\s-]?number|passport)\b/i,
    exclude: /issue|expiry|place|valid/i,
    getValue: (p) => p.identification?.passportNumber || "AH927400"
  },
  {
    key: "identification.passportIssueDate",
    regex: /\b(passport[_\s-]?issue[_\s-]?date|passport[_\s-]?date[_\s-]?of[_\s-]?issue)\b/i,
    getValue: (p) => p.identification?.passportIssueDate || "2025-09-30"
  },
  {
    key: "identification.passportExpiryDate",
    regex: /\b(passport[_\s-]?expir(y|ation)[_\s-]?date|passport[_\s-]?valid[_\s-]?until)\b/i,
    getValue: (p) => p.identification?.passportExpiryDate || "2035-09-29"
  },
  {
    key: "identification.passportPlaceOfIssue",
    regex: /\b(passport[_\s-]?place[_\s-]?of[_\s-]?issue|passport[_\s-]?issue[_\s-]?place)\b/i,
    getValue: (p) => p.identification?.passportPlaceOfIssue || "Mumbai"
  },
  {
    key: "identification.voterId",
    regex: /\b(voter[_\s-]?id|epic[_\s-]?no|voter[_\s-]?card|election[_\s-]?card)\b/i,
    getValue: (p) => p.identification?.voterId || "ZUT5583885"
  },

  // --- Portal & Account Password ---
  {
    key: "credentials.password",
    regex: /\b(password|passwd|pwd|passcode|portal[_\s-]?password|create[_\s-]?password|set[_\s-]?password|new[_\s-]?password)\b/i,
    exclude: /confirm|re[_\s-]?enter|repeat|verify|again|old|current|disability|differently|pwd[_\s-]?status/i,
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
    regex: /\b(pin|pincode|postal[_\s-]?code|zip|zip[_\s-]?code|area[_\s-]?code)\b/i,
    exclude: /phone|isd|dial/i,
    getValue: (p) => p.address?.pincode || "425201"
  },
  {
    key: "address.city",
    regex: /\b(city|town|district|current[_\s-]?city|present[_\s-]?city|permanent[_\s-]?city)\b/i,
    exclude: /state|country|address|street|birth/i,
    getValue: (p) => p.address?.city || "Bhusawal"
  },
  {
    key: "address.district",
    regex: /\b(district|taluka|tehsil)\b/i,
    getValue: (p) => p.address?.district || "Jalgaon"
  },
  {
    key: "address.state",
    regex: /\b(state|province|region|current[_\s-]?state|permanent[_\s-]?state|state[_\s-]?\/[_\s-]?ut)\b/i,
    getValue: (p) => p.address?.state || "Maharashtra"
  },
  {
    key: "address.country",
    regex: /\b(country|nation|current[_\s-]?country|permanent[_\s-]?country)\b/i,
    getValue: (p) => p.address?.country || "India"
  },
  {
    key: "address.domicilePlace",
    regex: /\b(domicile|domicile[_\s-]?state|domicile[_\s-]?place|place[_\s-]?of[_\s-]?domicile)\b/i,
    getValue: (p) => p.address?.domicilePlace || "Bhusawal, Maharashtra"
  },
  {
    key: "address.streetAddress1",
    regex: /\b(address[_\s-]?line[_\s-]?1|street[_\s-]?address[_\s-]?1|house[_\s-]?no|flat[_\s-]?no|building[_\s-]?name|plot[_\s-]?no)\b/i,
    getValue: () => "Near Mujib Members House, Khadka, New Eidgah Colony"
  },
  {
    key: "address.streetAddress2",
    regex: /\b(address[_\s-]?line[_\s-]?2|street[_\s-]?address[_\s-]?2|colony|landmark|locality|area|street)\b/i,
    getValue: () => "Bhusawal (Rural), Dist. Jalgaon"
  },
  {
    key: "address.fullAddress",
    regex: /\b(address|street[_\s-]?address|residential[_\s-]?address|permanent[_\s-]?address|current[_\s-]?address|correspondence[_\s-]?address|present[_\s-]?address)\b/i,
    exclude: /email|mac|ip|state|city|pin|zip|line[_\s-]?1|line[_\s-]?2/i,
    getValue: (p) => p.address?.fullAddress || "Near Mujib Members House, Khadka, New Eidgah Colony, Bhusawal (Rural), Dist. Jalgaon, Maharashtra - 425201, India"
  },

  // --- Social Links & Portfolios ---
  {
    key: "links.linkedin",
    regex: /\b(linkedin|linkedin[_\s-]?profile|linkedin[_\s-]?url|linkedin[_\s-]?handle)\b/i,
    getValue: (p) => p.links?.linkedin || "https://linkedin.com/in/danish-jsx"
  },
  {
    key: "links.github",
    regex: /\b(github|github[_\s-]?profile|github[_\s-]?url|github[_\s-]?handle|git[_\s-]?profile)\b/i,
    getValue: (p) => p.links?.github || "https://github.com/Danishekhan"
  },
  {
    key: "links.portfolio",
    regex: /\b(portfolio|personal[_\s-]?website|web[_\s-]?site|personal[_\s-]?url|blog|portfolio[_\s-]?link)\b/i,
    exclude: /company|linkedin|github|twitter|leetcode/i,
    getValue: (p) => p.links?.portfolio || "https://itsdanishkhan.me"
  },
  {
    key: "links.leetcode",
    regex: /\b(leetcode|leetcode[_\s-]?profile|coding[_\s-]?profile)\b/i,
    getValue: (p) => p.links?.leetcode || "https://leetcode.com/u/Danishekhan/"
  },

  // --- 10th Standard / Secondary School (SSC) ---
  {
    key: "academics.tenth.percentage",
    regex: /\b(10th[_\s-]?%|10th[_\s-]?percentage|ssc[_\s-]?%|ssc[_\s-]?percentage|secondary[_\s-]?percentage|10th[_\s-]?marks[_\s-]?%|tenth[_\s-]?percentage)\b/i,
    getValue: (p) => p.academics?.tenth?.percentage || "89.60"
  },
  {
    key: "academics.tenth.cgpa",
    regex: /\b(10th[_\s-]?cgpa|ssc[_\s-]?cgpa|secondary[_\s-]?cgpa|10th[_\s-]?gpa)\b/i,
    getValue: (p) => p.academics?.tenth?.cgpa || "8.96"
  },
  {
    key: "academics.tenth.schoolName",
    regex: /\b(10th[_\s-]?school|ssc[_\s-]?school|secondary[_\s-]?school|10th[_\s-]?institution|10th[_\s-]?board[_\s-]?school)\b/i,
    getValue: (p) => p.academics?.tenth?.schoolName || "B.Z. Urdu High School & Jr. College, Khadka Road, Bhusawal"
  },
  {
    key: "academics.tenth.board",
    regex: /\b(10th[_\s-]?board|ssc[_\s-]?board|secondary[_\s-]?board|10th[_\s-]?education[_\s-]?board)\b/i,
    getValue: (p) => p.academics?.tenth?.board || "Maharashtra State Board (Nashik Divisional Board)"
  },
  {
    key: "academics.tenth.passingYear",
    regex: /\b(10th[_\s-]?passing[_\s-]?year|10th[_\s-]?year|ssc[_\s-]?year|10th[_\s-]?completion[_\s-]?year)\b/i,
    getValue: (p) => p.academics?.tenth?.passingYear || "2020"
  },
  {
    key: "academics.tenth.seatNumber",
    regex: /\b(10th[_\s-]?seat|ssc[_\s-]?seat|10th[_\s-]?roll|ssc[_\s-]?roll)\b/i,
    getValue: (p) => p.academics?.tenth?.seatNumber || "D174071"
  },
  {
    key: "academics.tenth.marksObtained",
    regex: /\b(10th[_\s-]?marks[_\s-]?obtained|ssc[_\s-]?marks[_\s-]?obtained|10th[_\s-]?secured)\b/i,
    getValue: (p) => p.academics?.tenth?.marksObtained || "448"
  },
  {
    key: "academics.tenth.totalMarks",
    regex: /\b(10th[_\s-]?total[_\s-]?marks|ssc[_\s-]?total[_\s-]?marks|10th[_\s-]?max[_\s-]?marks)\b/i,
    getValue: (p) => p.academics?.tenth?.totalMarks || "500"
  },

  // --- 12th Standard / HSC / Diploma ---
  {
    key: "academics.twelfth.percentage",
    regex: /\b(12th[_\s-]?%|12th[_\s-]?percentage|hsc[_\s-]?%|hsc[_\s-]?percentage|higher[_\s-]?secondary[_\s-]?percentage|diploma[_\s-]?%|twelfth[_\s-]?percentage)\b/i,
    getValue: (p) => p.academics?.twelfth?.percentage || "70.50"
  },
  {
    key: "academics.twelfth.cgpa",
    regex: /\b(12th[_\s-]?cgpa|hsc[_\s-]?cgpa|higher[_\s-]?secondary[_\s-]?cgpa)\b/i,
    getValue: (p) => p.academics?.twelfth?.cgpa || "7.05"
  },
  {
    key: "academics.twelfth.collegeName",
    regex: /\b(12th[_\s-]?college|hsc[_\s-]?college|junior[_\s-]?college|12th[_\s-]?institution|12th[_\s-]?school)\b/i,
    getValue: (p) => p.academics?.twelfth?.collegeName || "Shri D. L. Hindi Junior College, Bhusawal"
  },
  {
    key: "academics.twelfth.board",
    regex: /\b(12th[_\s-]?board|hsc[_\s-]?board|higher[_\s-]?secondary[_\s-]?board)\b/i,
    getValue: (p) => p.academics?.twelfth?.board || "Maharashtra State Board (Nashik Divisional Board)"
  },
  {
    key: "academics.twelfth.passingYear",
    regex: /\b(12th[_\s-]?passing[_\s-]?year|12th[_\s-]?year|hsc[_\s-]?year|12th[_\s-]?completion[_\s-]?year)\b/i,
    getValue: (p) => p.academics?.twelfth?.passingYear || "2022"
  },
  {
    key: "academics.twelfth.stream",
    regex: /\b(12th[_\s-]?stream|hsc[_\s-]?stream|12th[_\s-]?branch|12th[_\s-]?discipline)\b/i,
    getValue: (p) => p.academics?.twelfth?.stream || "Science"
  },
  {
    key: "academics.twelfth.seatNumber",
    regex: /\b(12th[_\s-]?seat|hsc[_\s-]?seat|12th[_\s-]?roll|hsc[_\s-]?roll)\b/i,
    getValue: (p) => p.academics?.twelfth?.seatNumber || "S058734"
  },
  {
    key: "academics.twelfth.marksObtained",
    regex: /\b(12th[_\s-]?marks[_\s-]?obtained|hsc[_\s-]?marks[_\s-]?obtained|12th[_\s-]?secured)\b/i,
    getValue: (p) => p.academics?.twelfth?.marksObtained || "423"
  },
  {
    key: "academics.twelfth.totalMarks",
    regex: /\b(12th[_\s-]?total[_\s-]?marks|hsc[_\s-]?total[_\s-]?marks|12th[_\s-]?max[_\s-]?marks)\b/i,
    getValue: (p) => p.academics?.twelfth?.totalMarks || "600"
  },

  // --- Graduation / Undergrad (B.Tech) ---
  {
    key: "academics.graduation.cgpa",
    regex: /\b(cgpa|gpa|grade[_\s-]?point|cumulative[_\s-]?gpa|b\.?tech[_\s-]?cgpa|degree[_\s-]?cgpa|overall[_\s-]?cgpa|current[_\s-]?cgpa)\b/i,
    getValue: (p) => p.academics?.graduation?.cgpa || "7.79"
  },
  {
    key: "academics.graduation.percentageEquivalent",
    regex: /\b(degree[_\s-]?%|graduation[_\s-]?percentage|b\.?tech[_\s-]?%|b\.?tech[_\s-]?percentage|percentage[_\s-]?in[_\s-]?graduation)\b/i,
    getValue: (p) => p.academics?.graduation?.percentageEquivalent || "70.40"
  },
  {
    key: "academics.graduation.collegeName",
    regex: /\b(college|university|institution|institute|graduating[_\s-]?college|b\.?tech[_\s-]?college)\b/i,
    exclude: /10th|12th|high[_\s-]?school|junior|ssc|hsc/i,
    getValue: (p) => p.academics?.graduation?.collegeName || "G H Raisoni College of Engineering and Management, Jalgaon"
  },
  {
    key: "academics.graduation.university",
    regex: /\b(university|affiliat(ed|ing)[_\s-]?university|degree[_\s-]?university)\b/i,
    getValue: (p) => p.academics?.graduation?.university || "Kavayitri Bahinabai Chaudhari North Maharashtra University (KBC NMU), Jalgaon"
  },
  {
    key: "academics.graduation.degree",
    regex: /\b(degree|qualification|graduation[_\s-]?course|highest[_\s-]?qualification|highest[_\s-]?degree|education[_\s-]?level|undergraduate[_\s-]?degree)\b/i,
    getValue: (p) => p.academics?.graduation?.degree || "Bachelor of Technology (B.Tech)"
  },
  {
    key: "academics.graduation.branch",
    regex: /\b(branch|major|field[_\s-]?of[_\s-]?study|specialization|discipline|degree[_\s-]?stream|engineering[_\s-]?branch)\b/i,
    getValue: (p) => p.academics?.graduation?.branch || "Artificial Intelligence"
  },
  {
    key: "academics.graduation.passingYear",
    regex: /\b(graduation[_\s-]?year|year[_\s-]?of[_\s-]?graduation|passing[_\s-]?year|batch|grad[_\s-]?year|year[_\s-]?of[_\s-]?passing|expected[_\s-]?graduation)\b/i,
    exclude: /10th|12th|ssc|hsc/i,
    getValue: (p) => p.academics?.graduation?.passingYear || "2026"
  },
  {
    key: "academics.graduation.startYear",
    regex: /\b(graduation[_\s-]?start[_\s-]?year|joining[_\s-]?year|commencement[_\s-]?year)\b/i,
    getValue: (p) => p.academics?.graduation?.startYear || "2022"
  },
  {
    key: "academics.graduation.backlogs",
    regex: /\b(backlogs?|active[_\s-]?backlogs?|arrears?|live[_\s-]?backlogs?|standing[_\s-]?arrears?|number[_\s-]?of[_\s-]?backlogs?)\b/i,
    getValue: (p) => p.academics?.graduation?.activeBacklogs || "0"
  },
  {
    key: "academics.graduation.hasBacklogs",
    regex: /\b(any[_\s-]?backlogs\??|have[_\s-]?you[_\s-]?any[_\s-]?backlogs\??|do[_\s-]?you[_\s-]?have[_\s-]?backlogs\??)\b/i,
    getValue: () => "No"
  },
  {
    key: "academics.graduation.prnNumber",
    regex: /\b(prn|prn[_\s-]?no|roll[_\s-]?no|registration[_\s-]?no|student[_\s-]?id|enrollment[_\s-]?no|hall[_\s-]?ticket[_\s-]?no)\b/i,
    getValue: (p) => p.academics?.graduation?.prnNumber || "2022100101010928"
  },
  {
    key: "academics.graduation.collegeRollNumber",
    regex: /\b(college[_\s-]?roll[_\s-]?no|class[_\s-]?roll[_\s-]?no)\b/i,
    getValue: (p) => p.academics?.graduation?.collegeRollNumber || "22111032"
  },

  // --- Career, CTC & Experience ---
  {
    key: "career.currentCompany",
    regex: /\b(current[_\s-]?company|present[_\s-]?company|employer|current[_\s-]?organization|latest[_\s-]?company)\b/i,
    getValue: (p) => p.career?.currentCompany || "Meet Bros"
  },
  {
    key: "career.currentRole",
    regex: /\b(current[_\s-]?title|current[_\s-]?role|job[_\s-]?title|designation|current[_\s-]?position)\b/i,
    getValue: (p) => p.career?.currentRole || "Full Stack Developer"
  },
  {
    key: "career.totalExperienceYears",
    regex: /\b(total[_\s-]?experience|years[_\s-]?of[_\s-]?experience|experience[_\s-]?in[_\s-]?years|overall[_\s-]?experience|total[_\s-]?exp)\b/i,
    exclude: /month/i,
    getValue: (p) => p.career?.totalExperienceYears || "1"
  },
  {
    key: "career.totalExperienceMonths",
    regex: /\b(total[_\s-]?experience[_\s-]?months|experience[_\s-]?in[_\s-]?months|months[_\s-]?of[_\s-]?experience)\b/i,
    getValue: (p) => p.career?.totalExperienceMonths || "9"
  },
  {
    key: "career.currentCtc",
    regex: /\b(current([_\s-]?(annual|fixed))?[_\s-]?(ctc|salary|package)|present[_\s-]?ctc|fixed[_\s-]?ctc)\b/i,
    getValue: (p, el) => {
      const ph = (el && el.placeholder ? el.placeholder.toLowerCase() : "");
      if (ph.includes("lakh") || ph.includes("lpa") || ph.includes("inr (lpa)")) {
        return p.career?.currentCtcLpa || "3.5";
      }
      if (ph.includes("per annum") && !ph.includes("lpa")) {
        return "350000";
      }
      return p.career?.currentCtcLpa || "3.5";
    }
  },
  {
    key: "career.expectedCtc",
    regex: /\b(expected([_\s-]?(annual|desired))?[_\s-]?(ctc|salary|package)|desired[_\s-]?ctc|salary[_\s-]?expectation|target[_\s-]?ctc)\b/i,
    getValue: (p, el) => {
      const ph = (el && el.placeholder ? el.placeholder.toLowerCase() : "");
      if (ph.includes("lakh") || ph.includes("lpa") || ph.includes("inr (lpa)")) {
        return p.career?.expectedCtcLpa || "7.0";
      }
      if (ph.includes("per annum") && !ph.includes("lpa")) {
        return "700000";
      }
      return p.career?.expectedCtcLpa || "7.0";
    }
  },
  {
    key: "career.noticePeriodDays",
    regex: /\b(notice[_\s-]?period|how[_\s-]?soon[_\s-]?can[_\s-]?you[_\s-]?join|availability|joining[_\s-]?time|notice[_\s-]?period[_\s-]?in[_\s-]?days|serving[_\s-]?notice)\b/i,
    getValue: (p, el) => {
      if (el && el.type === "number") return "0";
      return p.career?.noticePeriodString || "Immediate (0 Days)";
    }
  },
  {
    key: "career.preferredLocations",
    regex: /\b(preferred([_\s-]?job)?[_\s-]?locations?|desired[_\s-]?locations?|preferred[_\s-]?city|work[_\s-]?location[_\s-]?preferences?)\b/i,
    getValue: (p) => p.career?.preferredLocations || "Remote, Pune, Bengaluru, Mumbai, Hyderabad"
  },

  // --- Legal, Compliance & Screening Affirmations ---
  {
    key: "career.workAuthIndia",
    regex: /\b(legally[_\s-]?authorized.*india|authorized[_\s-]?to[_\s-]?work.*india|work[_\s-]?permit.*india|eligible[_\s-]?to[_\s-]?work.*india)\b/i,
    getValue: () => "Yes"
  },
  {
    key: "career.sponsorshipIndia",
    regex: /\b(sponsorship.*india|require[_\s-]?visa.*india|require.*sponsorship.*india)\b/i,
    getValue: () => "No"
  },
  {
    key: "career.workAuthUS",
    regex: /\b(legally[_\s-]?authorized.*(us|united[_\s-]?states|usa)|authorized[_\s-]?to[_\s-]?work.*(us|united[_\s-]?states|usa))\b/i,
    getValue: () => "No"
  },
  {
    key: "career.sponsorshipUS",
    regex: /\b(require[_\s-]?sponsorship.*(us|united[_\s-]?states|usa)|visa[_\s-]?sponsorship.*(us|united[_\s-]?states))\b/i,
    getValue: () => "Yes"
  },
  {
    key: "career.criminalConviction",
    regex: /\b(criminal|convict(ed)?|felony|misdemeanor|court[_\s-]?case|legal[_\s-]?proceedings|disciplinary[_\s-]?action)\b/i,
    getValue: () => "No"
  },
  {
    key: "career.relocate",
    regex: /\b(relocat(e|ion)|willing.*relocate|open[_\s-]?to[_\s-]?relocation)\b/i,
    getValue: () => "Yes"
  },
  {
    key: "career.shiftsTravel",
    regex: /\b(shifts?|night[_\s-]?shift|rotational[_\s-]?shift|travel|willing.*travel|work[_\s-]?in[_\s-]?shifts)\b/i,
    getValue: () => "Yes"
  },
  {
    key: "career.educationGap",
    regex: /\b(gap[_\s-]?in[_\s-]?education|education[_\s-]?gap|academic[_\s-]?gap|break[_\s-]?in[_\s-]?studies)\b/i,
    getValue: () => "No"
  },
  {
    key: "career.relativesInCompany",
    regex: /\b(relative.*(company|organization|firm)|family[_\s-]?member.*employed|referral[_\s-]?relation)\b/i,
    getValue: () => "No"
  },
  {
    key: "career.previouslyEmployed",
    regex: /\b(previously[_\s-]?employed|worked[_\s-]?here[_\s-]?before|former[_\s-]?employee|applied.*before)\b/i,
    getValue: () => "No"
  },
  {
    key: "career.validPassport",
    regex: /\b(have.*valid[_\s-]?passport|do[_\s-]?you[_\s-]?hold.*passport|possess.*passport)\b/i,
    getValue: () => "Yes"
  },
  {
    key: "career.termsConsent",
    regex: /\b(agree[_\s-]?to[_\s-]?terms|terms[_\s-]?and[_\s-]?conditions|privacy[_\s-]?policy|consent|declaration|certify|truthful|accept[_\s-]?terms)\b/i,
    getValue: () => "Yes"
  },

  // --- EEO & Diversity ---
  {
    key: "career.veteranStatus",
    regex: /\b(veteran[_\s-]?status|protected[_\s-]?veteran|armed[_\s-]?forces|military[_\s-]?service)\b/i,
    getValue: () => "No / Not a Veteran"
  },
  {
    key: "career.disabilityStatus",
    regex: /\b(disability|handicapped|pwd[_\s-]?status|physical[_\s-]?challenge|differently[_\s-]?abled)\b/i,
    getValue: () => "No / Not Disabled"
  },
  {
    key: "career.raceEthnicity",
    regex: /\b(race|ethnicity|ethnic[_\s-]?background|hispanic|latino|demographic[_\s-]?race)\b/i,
    getValue: () => "Asian (Indian)"
  },

  // --- Specific Skill Years Experience ---
  {
    key: "skills.react",
    regex: /\b(years[_\s.-]?of[_\s.-]?react|react([_\s.-]?js)?([_\s.-]*(\/|&)[_\s.-]*)?frontend|years[_\s.-]?react|react([_\s.-]?js)?[_\s.-]?(experience|exp))\b/i,
    getValue: (p) => String(p.skillYears?.["react"] || p.skillYears?.["react.js"] || 2)
  },
  {
    key: "skills.node",
    regex: /\b(years[_\s.-]?of[_\s.-]?node|node([_\s.-]?js)?([_\s.-]*(\/|&)[_\s.-]*)?express|years[_\s.-]?node|node([_\s.-]?js)?[_\s.-]?(experience|exp)|years[_\s.-]?express)\b/i,
    getValue: (p) => String(p.skillYears?.["node.js"] || p.skillYears?.["nodejs"] || p.skillYears?.["express"] || 2)
  },
  {
    key: "skills.java",
    regex: /\b(years[_\s.-]?of[_\s.-]?java|java([_\s.-]*(&|\/)[_\s.-]*)?dsa|years[_\s.-]?java|java[_\s.-]?(experience|exp))\b/i,
    getValue: (p) => String(p.skillYears?.["java"] || 3)
  },
  {
    key: "skills.sql_mongodb",
    regex: /\b(years[_\s.-]?of[_\s.-]?(sql|mongodb|db|database)|(mongo(db)?|supabase|sql)([_\s.-]*(\/|&)[_\s.-]*(supabase|sql|mongo(db)?))+|years[_\s.-]?sql|years[_\s.-]?mongodb|database[_\s.-]?exp)\b/i,
    getValue: (p) => String(p.skillYears?.["sql"] || p.skillYears?.["mongodb"] || p.skillYears?.["supabase"] || 2)
  },
  {
    key: "skills.javascript_typescript",
    regex: /\b(years[_\s.-]?of[_\s.-]?(javascript|typescript|js|ts)|(javascript|typescript)[_\s.-]?exp|years[_\s.-]?js|years[_\s.-]?ts)\b/i,
    getValue: (p) => String(p.skillYears?.["javascript"] || p.skillYears?.["typescript"] || 3)
  },
  {
    key: "skills.python",
    regex: /\b(years[_\s.-]?of[_\s.-]?python|python[_\s.-]?exp|years[_\s.-]?python)\b/i,
    getValue: (p) => String(p.skillYears?.["python"] || 1)
  },
  {
    key: "skills.tailwind_css",
    regex: /\b(years[_\s.-]?of[_\s.-]?(html|css|tailwind)|(html|css|tailwind)[_\s.-]?exp|years[_\s.-]?css|years[_\s.-]?tailwind)\b/i,
    getValue: (p) => String(p.skillYears?.["tailwind"] || p.skillYears?.["css"] || p.skillYears?.["html"] || 2)
  }
];

/**
 * Checks whether an element or label indicates an open-ended essay question suitable for Gemini AI.
 * @param {string} text - The label or question text.
 * @returns {boolean}
 */
function isOpenEndedQuestion(text) {
  if (!text || text.length < 10) return false;
  return /\b(why|describe|explain|tell us|what makes|biggest|accomplishment|challenge|project|experience with|motivation|strengths?|weakness(es)?|interests?|cover letter|additional information|briefly describe|summary of experience|about yourself|vision|proudest)\b/i.test(text);
}

/**
 * Smart resolver for Boolean (Yes/No) questions.
 * Inspects question text and returns the optimal candidate answer ("Yes" or "No").
 * @param {string} text - The question text
 * @returns {string} - "Yes" or "No"
 */
function resolveBooleanQuestion(text) {
  if (!text) return "Yes";
  const t = text.toLowerCase();

  // Negative questions (Convictions, Backlogs, Sponsorship in India, Career Gaps, Disciplinary Actions)
  if (/\b(convict|criminal|felony|court|misdemeanor|disciplinary|backlogs?|arrears?|gaps?\b|relative|former.*employee|worked.*before|previously.*applied|sponsorship.*india|require.*visa.*india)\b/i.test(t)) {
    return "No";
  }

  // Affirmative questions (Work auth, relocation, shift work, valid passport, certifications, full-time availability)
  if (/\b(authoriz|permit|eligible|relocat|shift|travel|passport|agree|certify|consent|immediate|full[_\s-]?time|confirm|accept)\b/i.test(t)) {
    return "Yes";
  }

  return "Yes";
}

if (typeof window !== 'undefined') {
  window.FIELD_PATTERNS = FIELD_PATTERNS;
  window.isOpenEndedQuestion = isOpenEndedQuestion;
  window.resolveBooleanQuestion = resolveBooleanQuestion;
}
if (typeof self !== 'undefined') {
  self.FIELD_PATTERNS = FIELD_PATTERNS;
  self.isOpenEndedQuestion = isOpenEndedQuestion;
  self.resolveBooleanQuestion = resolveBooleanQuestion;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FIELD_PATTERNS, isOpenEndedQuestion, resolveBooleanQuestion };
}
