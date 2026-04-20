/** @typedef {'text' | 'numeric' | 'decimal' | 'chips' | 'multiselect' | 'tools'} OnboardingInputType */

/**
 * @typedef {Object} OnboardingStep
 * @property {string} id
 * @property {string} assistantText  — supports {{firstName}} interpolation
 * @property {OnboardingInputType} inputType
 * @property {string[]} [chips]
 * @property {boolean} [optional]
 * @property {string} [placeholder]
 * @property {string} [followUpPrefix]  — shown before the follow-up input
 * @property {Record<string, string[]>} [conditionalChips] — chips keyed by previous answer
 * @property {string} [conditionalOn]   — id of step whose answer determines chips
 */

/** @type {OnboardingStep[]} */
export const FREELANCER_STEPS = [
  {
    id: 'welcome',
    assistantText:
      "Hey {{firstName}} 👋 I'm your Scout AI. I'm going to ask you a few quick questions so we can build your profile and find you the right clients. It'll take about 3 minutes. Ready?",
    inputType: 'chips',
    chips: ["Let's go", 'Sure'],
  },
  {
    id: 'specialty',
    assistantText: 'What type of freelance work do you do?',
    inputType: 'tools',
    chips: [
      'UI/UX Design',
      'Web Development',
      'Video Editing',
      'Copywriting & Content',
      'Branding & Graphic Design',
      'Consulting',
      'Photography',
      'Motion Graphics',
      'Other',
    ],
    placeholder: 'Tell me what you do',
  },
  {
    id: 'tools',
    assistantText: 'Nice! What tools do you use most in your work?',
    inputType: 'tools',
    conditionalOn: 'specialty',
    conditionalChips: {
      'UI/UX Design': ['Figma', 'Adobe XD', 'Sketch', 'Framer', 'Webflow', 'Other'],
      'Web Development': ['React', 'Vue', 'Node', 'Python', 'Flutter', 'Other'],
      'Video Editing': ['Premiere Pro', 'Final Cut', 'DaVinci Resolve', 'After Effects', 'CapCut', 'Other'],
      'Copywriting & Content': ['Google Docs', 'Notion', 'WordPress', 'Substack', 'Other'],
      'Branding & Graphic Design': ['Illustrator', 'Photoshop', 'InDesign', 'Canva', 'Figma', 'Other'],
      'Consulting': ['Notion', 'Miro', 'Google Slides', 'Airtable', 'Excel', 'Other'],
      'Photography': ['Lightroom', 'Photoshop', 'Capture One', 'VSCO', 'Canva', 'Other'],
      'Motion Graphics': ['After Effects', 'Cinema 4D', 'Blender', 'Lottie', 'Rive', 'Other'],
      'Other': ['Notion', 'Figma', 'Google Docs', 'Slack', 'Trello', 'Other'],
    },
    chips: ['Figma', 'Adobe XD', 'Sketch', 'Framer', 'Webflow', 'React', 'Vue', 'Node', 'Python', 'Premiere Pro', 'Final Cut', 'Google Docs', 'Notion', 'Other'],
    placeholder: 'Add a tool',
  },
  {
    id: 'experience',
    assistantText: 'How long have you been freelancing?',
    inputType: 'chips',
    chips: ['Less than 1 year', '1–3 years', '3–5 years', '5–10 years', '10+ years'],
  },
  {
    id: 'project_length',
    assistantText: "What's your typical project length?",
    inputType: 'chips',
    chips: ['Under 1 week', '1–4 weeks', '1–3 months', '3+ months', 'It varies'],
  },
  {
    id: 'comm_style',
    assistantText: 'How do you like to communicate with clients?',
    inputType: 'chips',
    chips: ['Real-time (calls, Slack, DMs)', 'Async (email, recorded updates)', 'Mix of both'],
  },
  {
    id: 'rate_structure',
    assistantText: "What's your target rate?",
    inputType: 'chips',
    chips: ['Hourly', 'Per project', 'Retainer', 'It depends'],
  },
  {
    id: 'rate_amount',
    assistantText: "What's your rate? $",
    inputType: 'decimal',
    optional: true,
    placeholder: 'Amount in USD',
    conditionalOn: 'rate_structure',
    conditionalText: {
      Hourly: "What's your hourly rate? $",
      'Per project': "What's a typical project budget for you? $",
      Retainer: "What's your typical monthly retainer? $",
    },
    skipIf: { rate_structure: 'It depends' },
  },
  {
    id: 'availability',
    assistantText: 'Are you currently available to take on new projects?',
    inputType: 'chips',
    chips: ['Yes, immediately', 'Yes, starting…', 'No, just browsing for now'],
    datePickerChip: 'Yes, starting…',
  },
  {
    id: 'frustration',
    assistantText:
      "Last one — what's been your biggest frustration working with clients?",
    inputType: 'text',
    placeholder: 'E.g. late payments, scope creep, unclear feedback...',
  },
];

/** @type {OnboardingStep[]} */
export const CLIENT_STEPS = [
  {
    id: 'welcome',
    assistantText:
      "Hey {{firstName}} 👋 I'm your Scout AI. Let's figure out exactly what you need so I can match you with the right freelancer. This takes about 3 minutes. Ready?",
    inputType: 'chips',
    chips: ["Let's go", 'Sure'],
  },
  {
    id: 'brief_seed',
    assistantText: 'Tell me about your project. What do you need help with?',
    inputType: 'text',
    placeholder: 'E.g. I need a brand identity designed for my new startup',
  },
  {
    id: 'freelancer_type',
    assistantText: 'Got it. What type of freelancer are you looking for?',
    inputType: 'tools',
    chips: [
      'UI/UX Designer',
      'Web Developer',
      'Video Editor',
      'Copywriter',
      'Brand Designer',
      'Consultant',
      'Photographer',
      'Motion Designer',
      'Not sure — recommend one',
    ],
    placeholder: 'Tell me what you need',
  },
  {
    id: 'timeline',
    assistantText: 'When do you need this done by?',
    inputType: 'chips',
    chips: ['ASAP (under 1 week)', '2–4 weeks', '1–3 months', '3+ months', 'Flexible'],
  },
  {
    id: 'budget',
    assistantText: "What's your budget for this project?",
    inputType: 'chips',
    chips: ['Under $500', '$500–$2,000', '$2,000–$5,000', '$5,000–$10,000', '$10,000+', 'Not sure yet'],
  },
  {
    id: 'comm_pref',
    assistantText: 'How do you prefer to communicate during a project?',
    inputType: 'chips',
    chips: ['Real-time (calls and DMs)', 'Async (email and updates)', 'Mix of both'],
  },
  {
    id: 'decision_maker',
    assistantText: 'Who makes the final call on approvals and deliverables?',
    inputType: 'chips',
    chips: ['Just me', 'Me and a partner', "I'll need to loop in a team", "There's a separate decision maker above me"],
    followUp: {
      trigger: "There's a separate decision maker above me",
      text: "Got it. We'll make sure there's room in the project chat for them to be looped in.",
    },
  },
  {
    id: 'past_experience',
    assistantText: 'Have you worked with freelancers before?',
    inputType: 'chips',
    chips: ['Yes, many times', 'A few times', 'No, this is my first time'],
  },
  {
    id: 'past_detail',
    assistantText: 'What went well or badly in past projects?',
    inputType: 'text',
    conditionalOn: 'past_experience',
    showIf: ['Yes, many times', 'A few times'],
    chips: ['Skip'],
    placeholder: 'Share your experience or skip this one',
  },
  {
    id: 'success',
    assistantText: 'Last one — what does a successful outcome look like for you?',
    inputType: 'text',
    placeholder: 'E.g. A finished brand kit I can use across all our channels by launch day',
  },
];
