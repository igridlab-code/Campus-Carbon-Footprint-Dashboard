export interface CmsConfig {
  institutionName: string;
  institutionTagline: string;
  logoIgridUrl: string;
  logoInstitutionUrl: string;
  logoCollegeUrl: string;
  footerLogoUrl: string;
  faviconUrl: string;
  
  // Contact Details
  address: string;
  email: string;
  phone: string;
  phoneSecondary: string;
  websiteUrl: string;
  googleMapUrl: string;
  
  // Social Links
  facebookUrl: string;
  twitterUrl: string;
  linkedinUrl: string;
  instagramUrl: string;
  youtubeUrl: string;

  // Hero & Footer Content
  heroTitle: string;
  heroSubtitle: string;
  heroBannerImageUrl: string;
  careerBannerTitle: string;
  careerBannerSubtitle: string;
  footerDescription: string;

  // Footer & Branding
  copyrightText: string;
  poweredByText: string;

  // Theme Colors
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  sectionBackgroundColor: string;
}

export const DEFAULT_CMS_CONFIG: CmsConfig = {
  institutionName: 'Indra Ganesan Institutions',
  institutionTagline: 'Excellence, Innovation & Sustainability',
  logoIgridUrl: '',
  logoInstitutionUrl: '',
  logoCollegeUrl: '',
  footerLogoUrl: '',
  faviconUrl: '',
  
  address: 'IG Valley, Manikandam, Tiruchirappalli – 620012, Tamil Nadu, India',
  email: 'indraverseig@gmail.com',
  phone: '+91 8122277680',
  phoneSecondary: '+91 8056614862',
  websiteUrl: 'https://www.indraganesan.co.in',
  googleMapUrl: 'https://maps.google.com/?q=Indra+Ganesan+College+of+Engineering',
  
  facebookUrl: 'https://facebook.com',
  twitterUrl: 'https://twitter.com',
  linkedinUrl: 'https://linkedin.com',
  instagramUrl: 'https://instagram.com',
  youtubeUrl: 'https://youtube.com',

  heroTitle: 'Smart Campus Command Center',
  heroSubtitle: 'Monitoring carbon digital twin, satellite telemetry, and net-zero benchmarks for Indra Ganesan Institutions.',
  heroBannerImageUrl: '',
  careerBannerTitle: 'Ready to Launch Your Engineering Career?',
  careerBannerSubtitle: "Admissions are open for 2026-27. Secure your seat in India's premier engineering college.",
  footerDescription: 'Indra Ganesan Institutions is a premier educational group dedicated to academic excellence, innovation, and institutional sustainability.',

  copyrightText: '© 2026 Indra Ganesan Institutions. All rights reserved.',
  poweredByText: 'IndraVerse',

  primaryColor: '#0056D2',
  secondaryColor: '#0EA5E9',
  backgroundColor: '#F7F9FC',
  sectionBackgroundColor: '#F2F6FB'
};

export async function getCmsConfig(): Promise<CmsConfig> {
  try {
    const res = await fetch('/api/cms-config');
    if (res.ok) {
      const data = await res.json();
      return { ...DEFAULT_CMS_CONFIG, ...data };
    }
  } catch (err) {
    console.error('Error fetching CMS config:', err);
  }
  return DEFAULT_CMS_CONFIG;
}

export async function saveCmsConfig(config: CmsConfig): Promise<CmsConfig> {
  try {
    const currentToken = localStorage.getItem('indraverse_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }
    const res = await fetch('/api/cms-config', {
      method: 'POST',
      headers,
      body: JSON.stringify(config)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error('Error saving CMS config:', err);
  }
  return config;
}

export async function resetCmsConfig(): Promise<CmsConfig> {
  try {
    const currentToken = localStorage.getItem('indraverse_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }
    const res = await fetch('/api/cms-config', {
      method: 'POST',
      headers,
      body: JSON.stringify(DEFAULT_CMS_CONFIG)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error('Error resetting CMS config:', err);
  }
  return DEFAULT_CMS_CONFIG;
}
