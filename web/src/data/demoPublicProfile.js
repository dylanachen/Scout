/** Shown when storage is empty so the public profile page looks alive in demo. */

export function demoPortfolioSeed(freelancerId) {
  return [
    {
      id: 'demo-pf-1',
      freelancerId: String(freelancerId),
      projectId: 'demo-seed-1',
      title: 'SaaS marketing site',
      description:
        'Led end-to-end UI for a B2B analytics product: hero, pricing, and a reusable component library hand-off for engineering.',
      deliverableType: 'Web Development',
      skills: ['React', 'Figma', 'Design systems'],
      thumbnailDataUrl: null,
      createdAt: '2026-02-10T12:00:00.000Z',
    },
    {
      id: 'demo-pf-2',
      freelancerId: String(freelancerId),
      projectId: 'demo-seed-2',
      title: 'Product launch video',
      description:
        'Storyboard, motion graphics, and sound mix for a 90-second launch piece used across paid social and the homepage.',
      deliverableType: 'Video',
      skills: ['After Effects', 'Premiere', 'Sound design'],
      thumbnailDataUrl: null,
      createdAt: '2026-01-22T12:00:00.000Z',
    },
    {
      id: 'demo-pf-3',
      freelancerId: String(freelancerId),
      projectId: 'demo-seed-3',
      title: 'Mobile app UI kit',
      description:
        'High-fidelity screens, dark mode, and accessibility annotations for iOS; delivered as a Figma library with dev specs.',
      deliverableType: 'UI Design',
      skills: ['Figma', 'Prototyping', 'Accessibility'],
      thumbnailDataUrl: null,
      createdAt: '2025-11-05T12:00:00.000Z',
    },
  ];
}

export function demoTestimonialsSeed(freelancerId, freelancerName) {
  return [
    {
      id: 'demo-tst-1',
      freelancerId: String(freelancerId),
      rating: 5,
      text: 'Clear communication and shipped ahead of milestone. We will hire again.',
      clientName: 'Northwind LLC',
      status: 'approved',
    },
    {
      id: 'demo-tst-2',
      freelancerId: String(freelancerId),
      rating: 5,
      text: 'Beautiful craft on the video — nailed the tone we were going for.',
      clientName: 'Blue Harbor',
      status: 'approved',
    },
  ];
}
