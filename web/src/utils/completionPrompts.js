/** One-time modals after a project is marked complete locally. */

export function portfolioPromptKey(projectId) {
  return `fos_portfolio_prompt_done_${projectId}`;
}

export function testimonialPromptKey(projectId) {
  return `fos_testimonial_prompt_done_${projectId}`;
}

export function clientRatingPromptKey(projectId) {
  return `fos_client_rating_prompt_done_${projectId}`;
}

export function isPortfolioPromptDone(projectId) {
  try {
    return localStorage.getItem(portfolioPromptKey(projectId)) === '1';
  } catch {
    return true;
  }
}

export function isTestimonialPromptDone(projectId) {
  try {
    return localStorage.getItem(testimonialPromptKey(projectId)) === '1';
  } catch {
    return true;
  }
}

export function isClientRatingPromptDone(projectId) {
  try {
    return localStorage.getItem(clientRatingPromptKey(projectId)) === '1';
  } catch {
    return true;
  }
}

export function markPortfolioPromptDone(projectId) {
  try {
    localStorage.setItem(portfolioPromptKey(projectId), '1');
  } catch {
    /* ignore */
  }
}

export function markTestimonialPromptDone(projectId) {
  try {
    localStorage.setItem(testimonialPromptKey(projectId), '1');
  } catch {
    /* ignore */
  }
}

export function markClientRatingPromptDone(projectId) {
  try {
    localStorage.setItem(clientRatingPromptKey(projectId), '1');
  } catch {
    /* ignore */
  }
}
