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

const STORAGE_KEY = 'indraverse_cms_config';

export function getCmsConfig(): CmsConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_CMS_CONFIG, ...JSON.parse(saved) };
    }
  } catch (err) {
    console.error('Error reading CMS config from localStorage:', err);
  }
  return DEFAULT_CMS_CONFIG;
}

export function saveCmsConfig(config: CmsConfig): CmsConfig {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Error saving CMS config to localStorage:', err);
  }
  return config;
}

export function resetCmsConfig(): CmsConfig {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Error resetting CMS config:', err);
  }
  return DEFAULT_CMS_CONFIG;
}
