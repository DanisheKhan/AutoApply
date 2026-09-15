/**
 * Default candidate profile pre-populated with Mohammad Danish Khan's real master bio-data.
 * This is automatically seeded into chrome.storage.local on extension install.
 */
const DEFAULT_PROFILE = {
  // Gemini AI Configuration
  gemini: {
    apiKey: "",
    model: "gemini-3.6-flash",
    tone: "professional_concise",
    customInstructions: "Answer job application screening questions highlighting my full-stack web development skills (React, Node.js, Express, MongoDB, Supabase, Tailwind CSS, REST APIs), real-world freelance & client projects (Madina Perfumes, Muskan Hospital, Vega Star, AURA Restauracja), and strong Java DSA foundation (500+ problems solved). Showcase dual-track experience in rapid client delivery and robust software engineering practices. Keep answers clear, authentic, and high-impact."
  },

  // Personal Information
  personal: {
    fullName: "Mohammad Danish Khan Naeem Khan",
    certificateName: "Mohammad Danish Khan",
    shortName: "Danish Khan",
    firstName: "Mohammad Danish Khan",
    firstName2Field: "Mohammad Danish Khan",
    firstName3Field: "Mohammad Danish",
    middleName: "Khan",
    lastName: "Naeem Khan",
    fatherName: "Naeem Khan Ishaque Khan",
    fatherFullName: "Naeem Khan Ishaque Khan",
    fatherFirstName: "Naeem",
    fatherMiddleName: "Khan",
    fatherLastName: "Ishaque Khan",
    motherName: "Yasmeen Bano",
    motherFirstName: "Yasmeen",
    motherLastName: "Bano",
    dob: "2005-06-01",
    dobFormatted: "01/06/2005",
    gender: "Male",
    bloodGroup: "AB+",
    nationality: "Indian",
    motherTongue: "Urdu",
    religion: "Islam",
    casteCategory: "Open / EWS (Economically Weaker Section)",
    minorityStatus: "Yes (Religious & Linguistic Minority)",
    email: "danishkhan.jsx@gmail.com",
    phone: "+919322990946",
    phonePlain: "9322990946",
    password: "Danishe@1257",
    headline: "Full-Stack Web Developer | React, Node.js, MongoDB, Express, Supabase, Next.js, Tailwind CSS | Strong in DSA using Java | Freelancer & Web Architect"
  },

  // High-Level Candidate Summaries (for multi-skill and high-level academic fields)
  skillsSummary: "React.js, Node.js, Express.js, MongoDB, JavaScript, TypeScript, Tailwind CSS, Supabase, Next.js, Java DSA, REST APIs, Git, SQL",
  educationSummary: "B.Tech in Artificial Intelligence (CGPA: 7.79, 2022-2026, G H Raisoni College of Engineering and Management, Jalgaon)",

  // Contact & Social Links
  links: {
    portfolio: "https://itsdanishkhan.me",
    linkedin: "https://linkedin.com/in/danish-jsx",
    github: "https://github.com/Danishekhan",
    twitter: "",
    leetcode: "https://leetcode.com/u/Danishekhan/"
  },

  // Addresses
  address: {
    city: "Bhusawal",
    district: "Jalgaon",
    state: "Maharashtra",
    country: "India",
    pincode: "425201",
    streetAddress1: "Near Mujib Members House, Khadka, New Eidgah Colony",
    streetAddress2: "Bhusawal (Rural), Dist. Jalgaon",
    fullAddress: "Near Mujib Members House, Khadka, New Eidgah Colony, Bhusawal (Rural), Dist. Jalgaon, Maharashtra - 425201, India",
    correspondenceAddress: "Maulana Azad Nagar, Near Raza Tower Beside Noori Ki, Azad Nagar, Bhusawal (Rural), Dist. Jalgaon, Maharashtra - 425201, India",
    domicilePlace: "Bhusawal, Maharashtra"
  },

  // Government & Civil Identification (for Indian Enterprise portals like TCS, Infosys, etc.)
  identification: {
    panNumber: "NNPPK5977P",
    aadhaarNumber: "270883622036",
    aadhaarFormatted: "2708 8362 2036",
    passportNumber: "AH927400",
    passportIssueDate: "2025-09-30",
    passportExpiryDate: "2035-09-29",
    passportPlaceOfIssue: "Mumbai",
    voterId: "ZUT5583885"
  },

  // Portal & Account Registration Credentials
  credentials: {
    defaultPassword: "Danishe@1257"
  },

  // Academic Records (Granular for TCS iON, Infosys, and modern ATS)
  academics: {
    tenth: {
      standard: "10th / SSC",
      schoolName: "B.Z. Urdu High School & Jr. College, Khadka Road, Bhusawal",
      board: "Maharashtra State Board (Nashik Divisional Board)",
      passingYear: "2020",
      passingMonth: "March",
      seatNumber: "D174071",
      marksObtained: "448",
      totalMarks: "500",
      percentage: "89.60",
      cgpa: "8.96",
      division: "First Class with Distinction",
      mediumOfInstruction: "Urdu / English",
      subjectMarks: {
        urdu: { obtained: "92", max: "100" },
        marathiHindi: { obtained: "70", max: "100" },
        english: { obtained: "90", max: "100" },
        maths: { obtained: "87", max: "100" },
        science: { obtained: "94", max: "100" },
        socialSciences: { obtained: "85", max: "100" }
      }
    },
    twelfth: {
      standard: "12th / HSC",
      stream: "Science (PCM with Computer Science)",
      streamShort: "PCMCS",
      specialization: "Computer Science (PCM + CS)",
      subjects: "Physics, Chemistry, Mathematics, Computer Science, English",
      group: "PCMCS",
      collegeName: "Shri D. L. Hindi Junior College, Bhusawal",
      board: "Maharashtra State Board (Nashik Divisional Board)",
      passingYear: "2022",
      passingMonth: "March",
      seatNumber: "S058734",
      marksObtained: "423",
      totalMarks: "600",
      percentage: "70.50",
      cgpa: "7.05",
      division: "First Class",
      mediumOfInstruction: "English",
      subjectMarks: {
        english: { obtained: "51", max: "100" },
        maths: { obtained: "85", max: "100" },
        physics: { obtained: "70", max: "100" },
        chemistry: { obtained: "79", max: "100" },
        computerScience: { obtained: "138", max: "200" }
      }
    },
    graduation: {
      degree: "Bachelor of Technology (B.Tech)",
      major: "Artificial Intelligence and Data Science / Computer Science",
      branch: "Artificial Intelligence",
      collegeName: "G H Raisoni College of Engineering and Management, Jalgaon",
      university: "Kavayitri Bahinabai Chaudhari North Maharashtra University (KBC NMU), Jalgaon",
      status: "Completed / Graduated",
      startYear: "2022",
      startDate: "2022-08-01",
      startDateFormatted: "01/08/2022",
      passingYear: "2026",
      endDate: "2026-06-30",
      endDateFormatted: "30/06/2026",
      duration: "2022 - 2026 (4 Years)",
      durationYears: "4",
      passingMonth: "Summer 2026",
      prnNumber: "2022100101010928",
      collegeRollNumber: "22111032",
      registrationNumber: "22G0005AIG1057",
      cgpa: "7.79",
      cgpaMax: "10.0",
      percentageEquivalent: "70.40",
      activeBacklogs: "0",
      totalBacklogs: "0",
      hasBacklogs: "No"
    }
  },

  // Career & CTC Details
  career: {
    totalExperienceYears: "1",
    totalExperienceMonths: "12",
    currentRole: "Full Stack Developer",
    currentCompany: "Meet Bros",
    noticePeriodDays: "0",
    noticePeriodString: "Immediate (0 Days)",
    currentCtcLpa: "0",
    currentCtcInr: "0",
    expectedCtcLpa: "5.0",
    expectedCtcInr: "500000",
    preferredLocations: "Remote, Pune, Bengaluru, Mumbai, Hyderabad",
    workAuthorizationUS: "No",
    requiresSponsorshipUS: "Yes",
    workAuthorizationIndia: "Yes",
    requiresSponsorshipIndia: "No",
    genderDiversity: "Male",
    veteranStatus: "No / Not a Veteran",
    disabilityStatus: "No / Not Disabled"
  },

  // Work Experience
  experience: [
    {
      company: "Meet Bros",
      role: "Website & UI/UX Designer & Developer Intern",
      employmentType: "Internship (Remote)",
      startDate: "2025-06-01",
      endDate: "2026-03-31",
      duration: "June 2025 – March 2026 (10 months)",
      location: "Remote",
      highlights: [
        "Website & UI/UX Designer and Developer for client portals and presentation deliverables across a 10-month engagement.",
        "Built and shipped 3 production-level web applications (Vegeta Star Film, Dynameet, HarryOm) using React.js, Node.js, Express.js, and Tailwind CSS.",
        "Authored end-to-end college submission documentation: internship report, PPT decks, Chapter 5 documentation, Company Introduction, and formal offer letter docs.",
        "Designed and presented a high-impact 10-slide AI presentation deck showcasing AI-driven workflows.",
        "Utilized full-stack engineering practices reducing front-end development time by ~25%.",
        "Engineered reusable UI components and achieved up to 30% faster page load times via code splitting, lazy loading, and asset optimization.",
        "Managed version control and team-based integrations via Git/GitHub workflows across 3+ production releases."
      ]
    }
  ],

  // Technical & Client Projects
  projects: [
    {
      name: "Madina Perfumes",
      type: "Client / Freelance",
      tagline: "Production E-Commerce Platform",
      stack: "React.js, Vite, Supabase, Node.js, Tailwind CSS, Razorpay, Shiprocket",
      url: "https://madinaperfumes.in",
      description: "Full-featured production store with user authentication, product catalogs, cart workflows, and admin dashboard. Razorpay live payments with HMAC webhook verification. Automated Shiprocket API order fulfillment via Supabase Edge Functions; deployed on Vercel with Cloudinary media optimization."
    },
    {
      name: "Muskan Hospital",
      type: "Client / Freelance",
      tagline: "Healthcare & Hospital Web Portal",
      stack: "React.js, Responsive CSS, Modern Web Stack",
      url: "https://muskanhospital.in",
      description: "Public-facing hospital website built for a real healthcare client, featuring departmental overviews, doctor schedules, and patient inquiry workflows."
    },
    {
      name: "Vega Star Entertainment",
      type: "Client / Freelance",
      tagline: "Cinema & Production House Showcase",
      stack: "Wix Platform, Custom HTML5, CSS3, JavaScript",
      url: "https://vega-star-entertainm.com",
      description: "Cinema and film production client site with luxury light aesthetic, gold accents, and Playfair Display typography. Engineered custom cinematic dark HTML/CSS/JS 'What We Do' interactive page."
    },
    {
      name: "AURA Restauracja",
      type: "Client / Freelance",
      tagline: "International Restaurant Website",
      stack: "HTML5, CSS3, JavaScript, Responsive UI",
      url: "https://itsdanishkhan.me",
      description: "Restaurant website created for an international client located in Puławy, Poland, showcasing culinary menus, atmosphere gallery, and reservation contact points."
    },
    {
      name: "Pinch Beverages",
      type: "Client / Freelance Proposal",
      tagline: "Brand Platform Proposal",
      stack: "Python, ReportLab, Web Architecture",
      url: "https://itsdanishkhan.me",
      description: "Delivered comprehensive freelance proposals and architectural specs (₹17K static site / ₹38K full platform options) rendered via ReportLab automated PDF engine."
    },
    {
      name: "CodeRace",
      type: "Personal / Product",
      tagline: "DSA Progress Tracking & Competition Platform",
      stack: "React.js, Supabase, PostgreSQL, Vercel",
      url: "https://coderace-danishkhan.vercel.app",
      description: "Full-stack platform tracking a 502-question DSA sheet across multiple users with topic progress bars, streaks, and a live leaderboard. Normalized PostgreSQL schema with Supabase Auth multi-user sign-up."
    },
    {
      name: "Hospital Management System (HMS)",
      type: "Personal / Product",
      tagline: "Subscription Healthcare ERP",
      stack: "MERN Stack, PostgreSQL/MongoDB, Role-Based Auth",
      url: "https://itsdanishkhan.me",
      description: "Comprehensive SaaS-model product covering outpatient OPD, admissions, clinical analytics, staff administration, digital Rx/prescription engine, and complete patient history tracking."
    },
    {
      name: "Gradify",
      type: "Personal / Product",
      tagline: "Student Result & Marksheet Portal",
      stack: "Database Schema Design, Web Stack",
      url: "https://itsdanishkhan.me",
      description: "Student marksheet and result portal designed for automated marks aggregation, CGPA calculation, and result distribution."
    },
    {
      name: "FocusFlow",
      type: "Personal / Product",
      tagline: "Productivity Tracking Browser Extension",
      stack: "Web Extensions API, JavaScript",
      url: "https://itsdanishkhan.me",
      description: "Productivity and deep-work tracking browser extension with tab usage analytics and focus timers."
    },
    {
      name: "Home Share",
      type: "Personal / Product",
      tagline: "Property Rental Web App",
      stack: "React.js, Node.js, Express.js, MongoDB, Bootstrap, Cloudinary",
      url: "https://itsdanishkhan.me",
      description: "Web application enabling user authentication, property listings, and interactive bookings. RESTful CRUD APIs using Express.js, JWT session management, and optimized MongoDB queries."
    }
  ],

  // Technical Skills List
  skills: {
    languages: ["JavaScript (ES6+)", "TypeScript", "Java", "HTML5", "CSS3", "Python"],
    frontend: ["React.js", "Next.js", "Tailwind CSS", "React Router", "Redux / Redux Toolkit", "Bootstrap", "Framer Motion", "UI/UX Design"],
    backend: ["Node.js", "Express.js", "MongoDB", "Supabase", "PostgreSQL", "RESTful APIs", "JWT Authentication"],
    toolsAndCloud: ["Vercel (CD)", "GitHub Actions (CI)", "Git", "GitHub", "Hostinger (FTP)", "AWS (Cloud Practitioner / Solutions Architect path)", "Docker", "Postman", "Ollama + Qwen2.5-Coder", "ReportLab", "Cloudinary"],
    core: ["Data Structures & Algorithms (DSA using Java)", "Problem Solving (Arrays, Strings, HashMaps, Kadane's, Trapping Rain Water)", "MERN Stack Architecture", "Dual-Track Freelancing & Placements", "Team Collaboration"]
  },

  // Specific Skill Experience in Years
  skillYears: {
    "javascript": 3,
    "typescript": 2,
    "react": 2,
    "react.js": 2,
    "node.js": 2,
    "nodejs": 2,
    "express": 2,
    "express.js": 2,
    "mongodb": 2,
    "postgresql": 1,
    "sql": 2,
    "supabase": 2,
    "html": 4,
    "css": 4,
    "tailwind": 2,
    "tailwind css": 2,
    "java": 3,
    "python": 1,
    "git": 3,
    "github": 3,
    "docker": 1,
    "rest api": 2,
    "restful apis": 2,
    "jwt": 2,
    "next.js": 1,
    "vercel": 2
  },

  // Raw Master Resume Text Context for Gemini AI Prompts
  masterResumeText: `
CANDIDATE: Mohammad Danish Khan (Danish Khan)
LOCATION: Bhusawal, Maharashtra, India (PIN: 425201)
CONTACT: +91 9322990946 | danishkhan.jsx@gmail.com
PORTFOLIO: https://itsdanishkhan.me | LINKEDIN: https://linkedin.com/in/danish-jsx | GITHUB: https://github.com/Danishekhan

PROFESSIONAL SUMMARY:
Full-Stack Web Developer proficient in MERN Stack (React.js, Node.js, Express.js, MongoDB), Supabase, PostgreSQL, Next.js, and Tailwind CSS. Strong algorithmic problem-solving foundation in Java Data Structures & Algorithms (500+ problems solved). Proven track record across commercial client projects (e-commerce, healthcare, hospitality), production internships, and scalable personal products with automated CI/CD. Target roles: Junior Developer / Full Stack / React Developer (Dual-track freelancing & enterprise placements).

EDUCATION:
- B.Tech in Artificial Intelligence: G H Raisoni College of Engineering and Management, Jalgaon (Autonomous), KBC NMU University. Graduated Summer 2026. Final CGPA: 7.79/10. Zero backlogs.
- Class XII (HSC - Science): Shri D. L. Hindi Junior College, Bhusawal (Maharashtra State Board). March 2022. Marks: 423/600 (70.50%).
- Class X (SSC): B.Z. Urdu High School & Jr. College, Bhusawal (Maharashtra State Board). March 2020. Marks: 448/500 (89.60% Distinction).

WORK EXPERIENCE:
- Meet Bros (Remote) | Website & UI/UX Designer & Developer Intern (June 2025 – March 2026, 10 months)
  * Shipped 3 production web apps (Vegeta Star Film, Dynameet, HarryOm) using React, Node, Express, Tailwind CSS.
  * Authored complete technical reports, presentation decks, Chapter 5 documentation, and company introduction materials.
  * Designed and presented a 10-slide AI presentation deck on applied AI workflows in modern engineering.
  * Reduced front-end development cycle time by 25% with modular component design.
  * Optimized page load times by up to 30% through code splitting, asset caching, and lazy loading.
  * Managed Git/GitHub CI/CD workflows and pull-request reviews across team releases.

CLIENT & FREELANCE PROJECTS:
1. Madina Perfumes (madinaperfumes.in): Production e-commerce store built with React, Vite, Supabase, Tailwind CSS, Razorpay live payments with HMAC verification, and automated Shiprocket dispatch.
2. Muskan Hospital (muskanhospital.in): Healthcare portal for a real hospital client, featuring department directories, doctor timetables, and patient inquiry workflows.
3. Vega Star Entertainment (vega-star-entertainm.com): Cinema production client website with luxury aesthetic, gold accents, and custom cinematic dark HTML/CSS/JS "What We Do" showcase.
4. AURA Restauracja: International restaurant website for a client in Puławy, Poland, featuring menus, dining gallery, and booking contacts.
5. Pinch Beverages: Formulated technical proposal and specs (₹17K static / ₹38K platform) rendered with ReportLab PDF generator.

PERSONAL & PRODUCT PROJECTS:
1. CodeRace (coderace-danishkhan.vercel.app): Full-stack DSA practice platform tracking a 502-question sheet with streaks, leaderboards, and normalized PostgreSQL / Supabase Auth.
2. Hospital Management System (HMS): Subscription-model clinic ERP covering OPD, admissions, analytics, staff, Rx prescriptions, and patient records.
3. Gradify: Student Result and Marksheet Portal with automated CGPA calculation.
4. FocusFlow: Browser extension for deep-work focus tracking.
5. Home Share: Property rental web app with React, Node, Express, MongoDB, and JWT authentication.

CORE SKILLS:
Languages: JavaScript (ES6+), TypeScript, Java, Python, HTML5, CSS3.
Frontend: React.js, Next.js, Tailwind CSS, Redux Toolkit, Framer Motion, UI/UX Design.
Backend: Node.js, Express.js, MongoDB, Supabase, PostgreSQL, RESTful APIs, JWT Auth.
Dev Tools & Cloud: Vercel (CD), GitHub Actions (CI), Hostinger FTP, AWS, Git, GitHub, Docker, Postman, Ollama + Qwen2.5-Coder, ReportLab.
`
};

if (typeof window !== 'undefined') {
  window.DEFAULT_PROFILE = DEFAULT_PROFILE;
}
if (typeof self !== 'undefined') {
  self.DEFAULT_PROFILE = DEFAULT_PROFILE;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DEFAULT_PROFILE };
}
