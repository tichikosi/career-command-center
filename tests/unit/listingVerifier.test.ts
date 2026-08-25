import { describe, it, expect } from 'vitest';
import { verifyJobListingContent } from '@/lib/server/listingVerifier';

describe('Job Listing Content Verification Unit Tests', () => {
  it('1. accepts verified active listings with matching company and title', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Director, AI Strategy - Anthropic Careers</title></head>
        <body>
          <h1>Director, AI Strategy & GTM Operations</h1>
          <p>Anthropic is seeking an experienced Director of AI Strategy to lead enterprise deployments.</p>
          <h2>Responsibilities</h2>
          <ul>
            <li>Lead AI GTM strategy and enterprise operations.</li>
          </ul>
          <h2>Qualifications</h2>
          <p>8+ years experience in GTM Operations.</p>
          <button>Apply for this job</button>
        </body>
      </html>
    `;

    const result = verifyJobListingContent({
      title: 'Director, AI Strategy & GTM Operations',
      company: 'Anthropic',
      htmlContent: html,
      url: 'https://boards.greenhouse.io/anthropic/jobs/123456',
    });

    expect(result.isVerifiedListing).toBe(true);
    expect(result.isExpired).toBe(false);
    expect(result.isGenericCareersPage).toBe(false);
    expect(result.matchConfidence).toBeGreaterThanOrEqual(70);
    expect(result.isAtsDomain).toBe(true);
  });

  it('2. detects and rejects expired or closed job listings', () => {
    const closedHtml = `
      <html>
        <head><title>Job Closed - Scale AI</title></head>
        <body>
          <h1>Head of BizOps & Strategy</h1>
          <div class="alert">This position has been filled and is no longer accepting applications.</div>
        </body>
      </html>
    `;

    const result = verifyJobListingContent({
      title: 'Head of BizOps & Strategy',
      company: 'Scale AI',
      htmlContent: closedHtml,
      url: 'https://scale.com/careers/closed-job',
    });

    expect(result.isVerifiedListing).toBe(false);
    expect(result.isExpired).toBe(true);
    expect(result.verificationReason).toContain('Expired or closed');
  });

  it('3. detects 404 page not found as expired/closed', () => {
    const notFoundHtml = `
      <html>
        <head><title>404 - Page Not Found</title></head>
        <body>
          <h1>Page Not Found</h1>
          <p>The job you are looking for has expired or been removed.</p>
        </body>
      </html>
    `;

    const result = verifyJobListingContent({
      title: 'Principal AI Solutions',
      company: 'OpenAI',
      htmlContent: notFoundHtml,
      url: 'https://openai.com/careers/missing',
    });

    expect(result.isVerifiedListing).toBe(false);
    expect(result.isExpired).toBe(true);
  });

  it('4. detects generic careers portal landing page lacking specific job details', () => {
    const genericCareersHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>Careers at Google</title></head>
        <body>
          <h1>Explore Open Roles</h1>
          <p>Join our team to build the future of technology.</p>
          <input placeholder="Search jobs by keyword" />
        </body>
      </html>
    `;

    const result = verifyJobListingContent({
      title: 'VP Operations & Enterprise Services',
      company: 'Google',
      htmlContent: genericCareersHtml,
      url: 'https://careers.google.com',
    });

    expect(result.isVerifiedListing).toBe(false);
    expect(result.isGenericCareersPage).toBe(true);
    expect(result.matchConfidence).toBeLessThan(50);
  });

  it('5. gives low match confidence for unrelated company or role title', () => {
    const unrelatedHtml = `
      <html>
        <head><title>Junior Barista - Local Coffee Co</title></head>
        <body>
          <h1>Junior Barista</h1>
          <p>Local Coffee is looking for part-time barista staff.</p>
        </body>
      </html>
    `;

    const result = verifyJobListingContent({
      title: 'Director of AI Strategy',
      company: 'Anthropic',
      htmlContent: unrelatedHtml,
      url: 'https://localcoffee.com/jobs/barista',
    });

    expect(result.isVerifiedListing).toBe(false);
    expect(result.matchConfidence).toBeLessThan(40);
  });

  it('6. awards structural bonus to recognized enterprise ATS domains', () => {
    const leverResult = verifyJobListingContent({
      title: 'Head of RevOps',
      company: 'Acme Corp',
      snippet: 'Acme Corp is hiring a Head of RevOps to oversee revenue operations and pipeline strategy.',
      url: 'https://jobs.lever.co/acmepayments/12345',
    });

    expect(leverResult.isAtsDomain).toBe(true);
    expect(leverResult.matchConfidence).toBeGreaterThanOrEqual(60);
  });
});
