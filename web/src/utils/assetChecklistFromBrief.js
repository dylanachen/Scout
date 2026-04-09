/**
 * Returns checklist rows from the client's onboarding brief (free text).
 * @param {string} brief
 * @returns {{ id: string; label: string }[]}
 */
export function generateChecklistItemsFromBrief(brief) {
  const t = String(brief ?? '').toLowerCase();

  const branding =
    /brand|logo|identity|guideline|palette|typography|visual/i.test(t) || /\bui\b|ux|design system/i.test(t);
  const web = /web|site|website|landing|app|frontend|hosting|domain|cms|wordpress|shopify/i.test(t);
  const video = /video|motion|edit|premiere|after effects|reel/i.test(t);
  const writing = /copy|content|blog|writing|documentation/i.test(t);

  const common = [
    { id: 'kickoff', label: 'Kickoff call scheduled and stakeholders identified' },
    { id: 'timeline', label: 'Target milestones and review dates agreed' },
  ];

  if (branding) {
    return [
      { id: 'brand_guidelines', label: 'Brand guidelines (fonts, colors, voice)' },
      { id: 'logo', label: 'Logo files (vector or high-resolution)' },
      { id: 'copy', label: 'Copy or messaging direction' },
      { id: 'refs', label: 'Reference mood boards or competitor examples' },
      ...common,
    ];
  }

  if (web) {
    return [
      { id: 'domain', label: 'Domain and DNS access (or registrar login)' },
      { id: 'hosting', label: 'Hosting or deployment credentials' },
      { id: 'content', label: 'Page content, imagery, and media assets' },
      { id: 'brand_assets', label: 'Existing brand assets (logos, icons, style guide)' },
      { id: 'analytics', label: 'Analytics or tracking requirements (GA, pixels, etc.)' },
      ...common,
    ];
  }

  if (video) {
    return [
      { id: 'footage', label: 'Raw footage or source files' },
      { id: 'audio', label: 'Music, VO, or licensed audio assets' },
      { id: 'brand_video', label: 'Brand assets (logos, lower thirds, fonts)' },
      { id: 'deliverables', label: 'Export specs (resolution, codec, aspect ratios)' },
      ...common,
    ];
  }

  if (writing) {
    return [
      { id: 'audience', label: 'Audience and tone guidelines' },
      { id: 'sources', label: 'Source material, interviews, or research links' },
      { id: 'seo', label: 'SEO keywords or editorial constraints' },
      ...common,
    ];
  }

  return [
    { id: 'scope', label: 'Written scope or list of deliverables' },
    { id: 'refs', label: 'Examples or references that show what “good” looks like' },
    { id: 'assets', label: 'Any files the freelancer will need on day one' },
    ...common,
  ];
}
