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
      // Smart detection: if surrounding form/section/card contains a middle name field, return 3-field first name ("Mohammad Danish")
      if (el) {
        const formOrContainer = (typeof el.closest === 'function')
          ? (el.closest('form') || el.closest('[role="form"]') || el.closest('.form-card') || el.closest('.tab-content') || el.closest('.accordion-body') || el.closest('.section-content') || el.closest('table') || el.closest('fieldset') || el.parentElement?.parentElement?.parentElement?.parentElement || el)
          : (typeof document !== 'undefined' ? document.body : null);
        if (formOrContainer) {
          const hasMiddleInput = formOrContainer.querySelector?.('input[name*="middle" i], input[id*="middle" i], input[placeholder*="middle" i], input[aria-label*="middle" i], input[data-qa*="middle" i]');
          const hasMiddleLabel = Array.from(formOrContainer.querySelectorAll?.('label, th, span, div, p') || []).some(l => /\bmiddle[_\s-]?name\b/i.test(l.textContent || ''));
          if (hasMiddleInput || hasMiddleLabel) {
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
    getValue: (p) => {
      if (p.personal?.lastName && p.personal?.lastName !== "Khan") {
        return p.personal.lastName;
      }
      return "Naeem Khan";
    }
  },
  {
    key: "personal.email",
    regex: /\b(e?mail|email[_\s-]?address|contact[_\s-]?email|primary[_\s-]?email|applicant[_\s-]?email)\b/i,
    exclude: /secondary|alternate|referral|company[_\s-]?email/i,
    getValue: (p) => p.personal?.email || "danishkhan.jsx@gmail.com"
  },
  {
    key: "personal.phoneCountryCode",
    regex: /\b(country([_\s-]?\/?[_\s-]?(region|territory))?[_\s-]?code|phone([_\s-]?\/?[_\s-]?(region|country))?[_\s-]?code|isd[_\s-]?code|dial(ing)?[_\s-]?code|phone[_\s-]?code|mobile[_\s-]?code|calling[_\s-]?code|phone[_\s-]?prefix)\b/i,
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
    regex: /\b(aadhaar|aadhar|uidai|adhaar[_\s-]?no|aadhaar[_\s-]?number|aadhaar[_\s-]?card|national[_\s-]?id)\b/i,
    exclude: /confirm|match|declaration|check|agree/i,
    getValue: (p, el) => {
      let label = "";
      try {
        if (typeof getElementLabel === 'function' && el) label = getElementLabel(el);
        if (!label && el) label = `${el.getAttribute('aria-label') || ''} ${el.name || ''} ${el.id || ''} ${el.placeholder || ''}`;
      } catch (e) {}

      const lLower = label.toLowerCase();
      const raw = p.identification?.aadhaarNumber || "270883622036";

      if (/last[_\s-]?8/i.test(lLower)) {
        return raw.slice(-8); // "83622036"
      }
      if (/last[_\s-]?4/i.test(lLower)) {
        return raw.slice(-4); // "2036"
      }

      const ph = (el && el.placeholder ? el.placeholder : "");
      if (ph.includes(" ") || ph.includes("-")) {
        return p.identification?.aadhaarFormatted || "2708 8362 2036";
      }
      return raw;
    }
  },
  {
    key: "identification.passportNumber",
    regex: /\b(passport[_\s-]?no|passport[_\s-]?number|if[_\s-]?yes\s*,?\s*passport[_\s-]?no|passport)\b/i,
    exclude: /issue|expiry|place|valid\b|hold/i,
    getValue: (p) => p.identification?.passportNumber || "AH927400"
  },
  {
    key: "identification.passportIssueDate",
    regex: /\b(passport[_\s-]?issue[_\s-]?date|passport[_\s-]?date[_\s-]?of[_\s-]?issue)\b/i,
    getValue: (p) => p.identification?.passportIssueDate || "2025-09-30"
  },
  {
    key: "identification.passportExpiryDate",
    regex: /\b(expiry[_\s-]?date[_\s-]?of[_\s-]?passport|passport[_\s-]?expir(y|ation)[_\s-]?date|passport[_\s-]?valid[_\s-]?until)\b/i,
    getValue: (p, el) => {
      const ph = (el && el.placeholder ? el.placeholder.toLowerCase() : "");
      if (ph.includes("mm/dd/yyyy")) return "09/29/2035";
      if (ph.includes("dd/mm/yyyy")) return "29/09/2035";
      return p.identification?.passportExpiryDate || "2035-09-29";
    }
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
    regex: /\b(pin|pincode|postal[_\s-]?code|zip|zip[_\s-]?code|zip\/postal[_\s-]?code|area[_\s-]?code)\b/i,
    exclude: /phone|isd|dial/i,
    getValue: (p) => p.address?.pincode || "425201"
  },
  {
    key: "address.currentLocation",
    regex: /\b(current[_\s-]?location|present[_\s-]?location|your[_\s-]?location|work[_\s-]?location|base[_\s-]?location)\b/i,
    exclude: /permanent|preference|preferred/i,
    getValue: (p) => p.address?.city || "Bhusawal"
  },
  {
    key: "address.permanentCity",
    regex: /\b(permanent[_\s-]?address[-_\s]?city|permanent[_\s-]?city|native[_\s-]?city|home[_\s-]?city)\b/i,
    getValue: (p) => p.address?.city || "Bhusawal"
  },
  {
    key: "address.permanentState",
    regex: /\b(permanent[_\s-]?address[-_\s]?state|permanent[_\s-]?state|native[_\s-]?state|home[_\s-]?state)\b/i,
    getValue: (p) => p.address?.state || "Maharashtra"
  },
  {
    key: "address.city",
    regex: /\b(city|town|district|current[_\s-]?city|present[_\s-]?city)\b/i,
    exclude: /state|country|address|street|birth|permanent/i,
    getValue: (p) => p.address?.city || "Bhusawal"
  },
  {
    key: "address.district",
    regex: /\b(district|taluka|tehsil)\b/i,
    getValue: (p) => p.address?.district || "Jalgaon"
  },
  {
    key: "address.country",
    regex: /\b(country([_\s-]?\/?[_\s-]?(region|territory))?([_\s-]?of[_\s-]?residence)?|residence[_\s-]?country|permanent[_\s-]?country|residential[_\s-]?country|nation|citizenship|nationality)\b/i,
    exclude: /code|isd|dial|prefix|county/i,
    getValue: (p) => p.address?.country || "India"
  },
  {
    key: "address.state",
    regex: /\b(state|province|state[_\s-]?\/[_\s-]?ut|current[_\s-]?state|region)\b/i,
    exclude: /country|nation|citizenship|code|isd|dial|prefix|county|permanent/i,
    getValue: (p) => p.address?.state || "Maharashtra"
  },
  {
    key: "address.domicilePlace",
    regex: /\b(domicile|domicile[_\s-]?state|domicile[_\s-]?place|place[_\s-]?of[_\s-]?domicile)\b/i,
    getValue: (p) => p.address?.domicilePlace || "Bhusawal, Maharashtra"
  },
  {
    key: "address.streetAddress1",
    regex: /\b(address[_\s-]?\(?line[_\s-]?1\)?|street[_\s-]?address[_\s-]?1|address[_\s-]?1|house[_\s-]?no|flat[_\s-]?no|building[_\s-]?name|plot[_\s-]?no)\b/i,
    getValue: () => "Near Mujib Members House, Khadka, New Eidgah Colony"
  },
  {
    key: "address.streetAddress2",
    regex: /\b(address[_\s-]?\(?line[_\s-]?2\)?|street[_\s-]?address[_\s-]?2|address[_\s-]?2|colony|landmark|locality|area|street)\b/i,
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
    exclude: /10th|12th|ssc|hsc|school|stipend|structure|ppo|internship|gone[_\s-]?through|clear.*stipend/i,
    getValue: (p) => p.academics?.graduation?.degree || "Bachelor of Technology (B.Tech)"
  },
  {
    key: "academics.graduation.courseName",
    regex: /\b(course[_\s-]?name|degree[_\s-]?name|program[_\s-]?name|graduation[_\s-]?course|course)\b/i,
    exclude: /10th|12th|ssc|hsc|school|stipend|structure|ppo|internship|gone[_\s-]?through|clear.*stipend/i,
    getValue: (p) => p.academics?.graduation?.degree || "Bachelor of Technology (B.Tech)"
  },
  {
    key: "profile.projectsDetails",
    regex: /\b(share.*details.*projects?|projects?.*internships?|details.*projects?|significant.*projects?|notable.*projects?|major.*projects?|key.*projects?|portfolio.*projects?|describe.*projects?)\b/i,
    exclude: /file|resume|cv|upload|document|attachment/i,
    getValue: () => "1. CodeRace: Full-Stack DSA tracking platform (React, Node.js, Express, PostgreSQL/Supabase, live leaderboard & streak calculations).\n2. Madina Perfumes: Production E-commerce web application (React, Express, Razorpay HMAC SHA256 webhook verification, Shiprocket API dispatch).\n3. Full Stack Intern at Meet Bros: Developed and deployed 3 responsive web applications, streamlining frontend workflow by 25%."
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
    key: "career.interestedInPpo",
    regex: /\b(ppo|pre[_\s-]?placement|post.*internship|full[_\s-]?time[_\s-]?offer|convert.*full[_\s-]?time)\b/i,
    getValue: () => "Yes"
  },
  {
    key: "career.programDetailsStipend",
    regex: /\b(stipend|program[_\s-]?structure|program[_\s-]?details|gone[_\s-]?through.*program|clear.*stipend|understand.*stipend|stipend.*structure)\b/i,
    getValue: () => "Yes"
  },
  {
    key: "career.workExperienceMonths",
    regex: /\b(how many months|months? of (work )?experience|month(s)?.*experience|work experience.*months?|total.*months.*exp|experience in months)\b/i,
    getValue: () => "10"
  },
  {
    key: "career.interviewedBefore",
    regex: /\b(interviewed.*(last|\d|prior|before)|applied.*(last|\d|prior|before)|interviewed[_\s-]?in[_\s-]?[a-z0-9]+\b.*months?)\b/i,
    getValue: () => "No"
  },
  {
    key: "career.validPassport",
    regex: /\b(valid[_\s-]?passport|have.*valid[_\s-]?passport|do[_\s-]?you[_\s-]?hold.*passport|possess.*passport|hold.*passport)\b/i,
    getValue: () => "Yes"
  },
  {
    key: "career.immigrationStatus",
    regex: /\b(immigration[_\s-]?status|residency[_\s-]?status|citizenship[_\s-]?status|alien[_\s-]?status)\b/i,
    getValue: () => "Citizen"
  },
  {
    key: "career.nationalIdConfirm",
    regex: /\b(i[_\s-]?confirm.*national[_\s-]?id|national[_\s-]?id.*correct|id.*provided.*correct|confirm.*official[_\s-]?records)\b/i,
    getValue: () => "Yes"
  },
  {
    key: "career.readAndUnderstood",
    regex: /\b(read[_\s-]?and[_\s-]?understood|read[_\s-]?&[_\s-]?understood|understood.*policies|read.*declaration)\b/i,
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
 * Universal Date Formatter for varied job form date inputs
 * @param {string} dobStr - "YYYY-MM-DD" e.g. "2005-06-01"
 * @param {HTMLElement|string} target - element or format string ("YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY", "DD-MM-YYYY")
 * @returns {string}
 */
function formatCandidateDate(dobStr, target) {
  if (!dobStr) return '';
  const parts = dobStr.split('-');
  if (parts.length !== 3) return dobStr;
  const [year, month, day] = parts;

  let format = 'YYYY-MM-DD';
  if (typeof target === 'string') {
    format = target.toUpperCase();
  } else if (target && typeof target.getAttribute === 'function') {
    const ph = (target.getAttribute('placeholder') || '').toUpperCase();
    const type = (target.getAttribute('type') || '').toLowerCase();
    if (type === 'date') return `${year}-${month}-${day}`;
    if (ph.includes('DD/MM/YYYY') || ph.includes('DD-MM-YYYY') || ph.includes('D/M/Y')) {
      format = ph.includes('-') ? 'DD-MM-YYYY' : 'DD/MM/YYYY';
    } else if (ph.includes('MM/DD/YYYY') || ph.includes('M/D/Y')) {
      format = 'MM/DD/YYYY';
    } else if (ph.includes('YYYY/MM/DD')) {
      format = 'YYYY/MM/DD';
    }
  }

  switch (format) {
    case 'DD/MM/YYYY': return `${day}/${month}/${year}`;
    case 'DD-MM-YYYY': return `${day}-${month}-${year}`;
    case 'MM/DD/YYYY': return `${month}/${day}/${year}`;
    case 'YYYY/MM/DD': return `${year}/${month}/${day}`;
    case 'YYYY-MM-DD':
    default:
      return `${year}-${month}-${day}`;
  }
}

/**
 * Aadhaar Number Formatter & Slicer
 * @param {string} aadhaarStr - e.g. "270883622036"
 * @param {HTMLElement|string} target - element or length ("12", "8", "4", "spaced")
 * @returns {string}
 */
function formatAadhaarNumber(aadhaarStr, target) {
  if (!aadhaarStr) return '270883622036';
  const clean = aadhaarStr.replace(/\D/g, '');
  
  let mode = '12';
  if (typeof target === 'string') {
    mode = target;
  } else if (target) {
    const maxLen = target.maxLength || target.getAttribute?.('maxlength');
    const ph = (target.placeholder || target.getAttribute?.('placeholder') || '').toLowerCase();
    const label = (target.getAttribute?.('aria-label') || '').toLowerCase();
    if (maxLen === 4 || maxLen === '4' || /last[_\s-]?4/i.test(ph) || /last[_\s-]?4/i.test(label)) {
      mode = '4';
    } else if (maxLen === 8 || maxLen === '8' || /last[_\s-]?8/i.test(ph) || /last[_\s-]?8/i.test(label)) {
      mode = '8';
    } else if (maxLen === 14 || maxLen === '14' || /xxxx[_\s-]xxxx[_\s-]xxxx/i.test(ph)) {
      mode = 'spaced';
    }
  }

  if (mode === '4') return clean.slice(-4);
  if (mode === '8') return clean.slice(-8);
  if (mode === 'spaced') return clean.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3');
  return clean;
}

/**
 * Job Form Identification & Context Engine
 * Discovers if the active page or element is an authentic Job Application Form
 */
const JobDetector = {
  KNOWN_PORTALS: [
    { name: 'Google Forms', test: (url, doc) => (url.hostname && url.hostname.includes('docs.google.com') && url.pathname && url.pathname.includes('/forms/')) || !!doc?.getElementById?.('google-form-mock') },
    { name: 'LinkedIn Easy Apply', test: (url, doc) => (url.hostname && url.hostname.includes('linkedin.com') && (url.pathname && url.pathname.includes('/jobs/') || !!doc?.querySelector?.('.jobs-easy-apply-modal, [data-test-modal], .jobs-apply-button'))) },
    { name: 'Greenhouse', test: (url, doc) => (url.hostname && url.hostname.includes('greenhouse.io')) || !!doc?.querySelector?.('#job_application, #application_form, [data-mapped="greenhouse"]') },
    { name: 'Lever', test: (url, doc) => (url.hostname && url.hostname.includes('lever.co')) || !!doc?.querySelector?.('.application-form, form#apply, [data-mapped="lever"]') },
    { name: 'Workday', test: (url, doc) => (url.hostname && (url.hostname.includes('myworkdayjobs.com') || url.hostname.includes('workday.com'))) || !!doc?.querySelector?.('[data-automation-id*="form"], [data-automation-id*="application"]') },
    { name: 'SmartRecruiters', test: (url, doc) => (url.hostname && url.hostname.includes('smartrecruiters.com')) || !!doc?.querySelector?.('[data-automation="application-form"]') },
    { name: 'Ashby', test: (url, doc) => (url.hostname && url.hostname.includes('ashbyhq.com')) || (url.pathname && url.pathname.includes('/application')) },
    { name: 'TCS / Infosys Enterprise', test: (url, doc) => (url.hostname && (url.hostname.includes('tcs') || url.hostname.includes('ion') || url.hostname.includes('nextstep') || url.hostname.includes('infosys') || url.hostname.includes('wipro') || url.hostname.includes('capgemini'))) || !!doc?.getElementById?.('enterprise-form-mock') },
    { name: 'Naukri / Indian Job Board', test: (url, doc) => (url.hostname && (url.hostname.includes('naukri.com') || url.hostname.includes('foundit.in') || url.hostname.includes('hirist.com') || url.hostname.includes('unstop.com') || url.hostname.includes('internshala.com'))) },
    { name: 'Wellfound / AngelList', test: (url, doc) => url.hostname && (url.hostname.includes('wellfound.com') || url.hostname.includes('angel.co')) },
    { name: 'Modern Tech ATS', test: (url, doc) => !!doc?.getElementById?.('modern-ats-mock') || !!doc?.getElementById?.('edgecases-form-mock') }
  ],

  JOB_KEYWORDS: [
    'resume', 'curriculum vitae', 'cv', 'cover letter', 'current ctc', 'expected ctc',
    'notice period', 'years of experience', 'highest education', 'degree', 'b.tech',
    'graduation year', 'college name', 'cgpa', 'work authorization', 'visa sponsorship',
    'relocation', 'github', 'portfolio', 'pan number', 'aadhaar', 'disability',
    'veteran', 'applicant', 'candidate', 'apply now', 'job application', 'job opening',
    'role', 'position', 'experience in years', 'expected salary', 'current salary',
    'willing to relocate', 'internship', 'full-time', 'fresher', 'pre-placement offer'
  ],

  NON_JOB_INDICATORS: [
    'search youtube', 'search google', 'search wikipedia', 'checkout', 'shopping cart',
    'billing address', 'credit card number', 'sign in to your account', 'post a comment'
  ],

  analyzePage(doc = (typeof document !== 'undefined' ? document : null), urlObj = (typeof window !== 'undefined' ? window.location : null)) {
    if (!doc || !urlObj) {
      return { isJobForm: false, platform: 'Standby', confidence: 0, fieldCount: 0, reason: 'No DOM/URL' };
    }

    // 1. Check direct portal matches
    for (const portal of this.KNOWN_PORTALS) {
      try {
        if (portal.test(urlObj, doc)) {
          // Additional Google Forms check: is this a job form or general survey?
          if (portal.name === 'Google Forms') {
            const pageText = (doc.body ? (doc.body.innerText || doc.body.textContent || '') : '').slice(0, 10000).toLowerCase();
            const formItems = doc.querySelectorAll('.Qr7Oae, .geS5n, .vQx30e, .gf-listitem, input, textarea');
            const hasJobKeywords = this.JOB_KEYWORDS.some(kw => pageText.includes(kw));
            if (hasJobKeywords || formItems.length >= 3) {
              return { isJobForm: true, platform: 'Google Forms (Job Application)', confidence: 95, fieldCount: formItems.length, reason: 'Google Forms Job Questionnaire' };
            }
            return { isJobForm: true, platform: 'Google Forms', confidence: 80, fieldCount: formItems.length, reason: 'Google Forms Portal' };
          }

          const fields = (typeof doc.querySelectorAll === 'function') 
            ? doc.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select, [role="listbox"], [role="radio"]') 
            : [];
          return { isJobForm: true, platform: portal.name, confidence: 95, fieldCount: fields.length, reason: `Recognized portal: ${portal.name}` };
        }
      } catch (e) {}
    }

    // 2. Scan forms & inputs for Job Form Semantic Heuristic Scoring
    const forms = (typeof doc.querySelectorAll === 'function') 
      ? doc.querySelectorAll('form, [role="form"], .application-form, .job-form, .apply-form, #apply, #job-apply, main, article, body') 
      : [];
    let bestScore = 0;
    let matchedKeywords = [];
    let detectedFields = 0;

    for (const container of forms) {
      const text = (container.innerText || container.textContent || '').toLowerCase().slice(0, 8000);
      const inputs = (typeof container.querySelectorAll === 'function') 
        ? container.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select') 
        : [];
      
      let score = 0;
      let keywords = [];

      for (const kw of this.JOB_KEYWORDS) {
        if (text.includes(kw)) {
          score += 15;
          keywords.push(kw);
        }
      }

      // Check input names / labels / placeholders
      for (const input of inputs) {
        const inputAttrs = `${input.name || ''} ${input.id || ''} ${input.placeholder || ''} ${input.getAttribute('aria-label') || ''}`.toLowerCase();
        if (/resume|cv|experience|degree|college|ctc|salary|notice|workauth|portfolio|github|aadhaar|pan/i.test(inputAttrs)) {
          score += 20;
        }
      }

      // Penalize search or checkout forms
      for (const nonKw of this.NON_JOB_INDICATORS) {
        if (text.includes(nonKw)) {
          score -= 15;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        matchedKeywords = keywords;
        detectedFields = inputs.length;
      }
    }

    const isJobForm = bestScore >= 35 && detectedFields >= 2;
    const confidence = Math.min(100, Math.max(0, bestScore));

    return {
      isJobForm,
      platform: isJobForm ? 'Job Application Form' : 'Non-Job Page',
      confidence,
      fieldCount: detectedFields,
      reason: isJobForm ? `Matched job markers: ${matchedKeywords.slice(0, 4).join(', ')}` : 'Standard web page'
    };
  },

  isJobContext(element, doc = (typeof document !== 'undefined' ? document : null)) {
    if (!doc && typeof document !== 'undefined') doc = document;
    if (!doc) return true;
    
    // Check page-level analysis first
    const pageAnalysis = this.analyzePage(doc, typeof window !== 'undefined' ? window.location : null);
    if (pageAnalysis.isJobForm) return true;

    // Check surrounding container if specific element provided
    if (element && typeof element.closest === 'function') {
      const container = element.closest('form, [role="form"], .application-form, .job-form, .apply-form, fieldset, .card, div[role="listitem"], .geS5n, .Qr7Oae');
      if (container) {
        const text = (container.innerText || container.textContent || '').toLowerCase();
        const hasJobKw = this.JOB_KEYWORDS.some(kw => text.includes(kw));
        if (hasJobKw) return true;
      }
    }

    return false;
  }
};

/**
 * Checks whether an element or label indicates an open-ended essay question suitable for Gemini AI.
 * @param {string} text - The label or question text.
 * @returns {boolean}
 */
function isOpenEndedQuestion(text) {
  if (!text || text.length < 10) return false;
  return /\b(why|describe|explain|tell us|what makes|biggest|accomplishment|challenge|project|internship|experience with|motivation|strengths?|weakness(es)?|interests?|cover letter|additional information|briefly describe|summary of experience|about yourself|vision|proudest|share.*details|significant|details on)\b/i.test(text);
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

  // Affirmative questions (Work auth, relocation, shift work, valid passport, certifications, full-time availability, PPO, stipend)
  if (/\b(authoriz|permit|eligible|relocat|shift|travel|passport|agree|certify|consent|immediate|full[_\s-]?time|confirm|accept|ppo|pre[_\s-]?placement|stipend|structure|program)\b/i.test(t)) {
    return "Yes";
  }

  return "Yes";
}

if (typeof window !== 'undefined') {
  window.FIELD_PATTERNS = FIELD_PATTERNS;
  window.isOpenEndedQuestion = isOpenEndedQuestion;
  window.resolveBooleanQuestion = resolveBooleanQuestion;
  window.JobDetector = JobDetector;
  window.formatCandidateDate = formatCandidateDate;
  window.formatAadhaarNumber = formatAadhaarNumber;
}
if (typeof self !== 'undefined') {
  self.FIELD_PATTERNS = FIELD_PATTERNS;
  self.isOpenEndedQuestion = isOpenEndedQuestion;
  self.resolveBooleanQuestion = resolveBooleanQuestion;
  self.JobDetector = JobDetector;
  self.formatCandidateDate = formatCandidateDate;
  self.formatAadhaarNumber = formatAadhaarNumber;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FIELD_PATTERNS,
    isOpenEndedQuestion,
    resolveBooleanQuestion,
    JobDetector,
    formatCandidateDate,
    formatAadhaarNumber
  };
}
