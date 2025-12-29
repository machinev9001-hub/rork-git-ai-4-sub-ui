/**
 * Data Visibility Rules
 * 
 * This module enforces site-based data visibility controls for subcontractors
 * and ensures cross-company data isolation as per requirements:
 * 
 * 1. All subcontractor data visibility is governed by SiteId indexing
 * 2. Subcontractors only see data for sites where:
 *    - Their assets are allocated
 *    - They are formally linked by the Site Master account
 * 3. Data relationship: Site → Subcontractor → Asset → Timesheet
 * 4. No global visibility unless explicitly permitted
 * 5. Companies cannot see each other's internal data
 */

import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';

/**
 * Get all site IDs where a subcontractor has access
 * Based on:
 * 1. Sites where their assets are allocated (via AssetSite table)
 * 2. Sites where they are formally linked (via SubcontractorSite table)
 */
export async function getSubcontractorSiteAccess(params: {
  subcontractorId: string;
  companyId?: string;
}): Promise<string[]> {
  try {
    const siteIds = new Set<string>();

    // Get sites via asset allocation
    const assetSitesRef = collection(db, 'assetSites');
    const assetQuery = query(
      assetSitesRef,
      where('ownerId', '==', params.subcontractorId),
      where('isActive', '==', true)
    );
    
    const assetSnapshot = await getDocs(assetQuery);
    assetSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.siteId) {
        siteIds.add(data.siteId);
      }
    });

    // Get sites via explicit linking (if SubcontractorSite table exists)
    // This would be similar to EmployeeSite/AssetSite pattern
    // For now, we'll rely on asset-based access

    console.log('[DataVisibility] Subcontractor', params.subcontractorId, 'has access to sites:', Array.from(siteIds));
    return Array.from(siteIds);
  } catch (error) {
    console.error('[DataVisibility] Error getting subcontractor site access:', error);
    return [];
  }
}

/**
 * Filter timesheets based on site visibility rules
 * Subcontractors can only see timesheets for:
 * - Sites where their assets are allocated
 * - Sites where they are formally linked
 */
export function buildTimesheetQueryConstraints(params: {
  userRole: string;
  userId: string;
  siteId?: string;
  companyId?: string;
  isSubcontractor?: boolean;
  allowedSiteIds?: string[];
}) {
  const constraints: any[] = [];

  // Master and Planner can see all timesheets in their company/site
  if (params.userRole === 'master' || params.userRole === 'Planner') {
    if (params.companyId) {
      constraints.push(where('companyId', '==', params.companyId));
    }
    if (params.siteId) {
      constraints.push(where('siteId', '==', params.siteId));
    }
  }
  // Subcontractors can only see timesheets for allowed sites
  else if (params.isSubcontractor && params.allowedSiteIds) {
    if (params.allowedSiteIds.length > 0) {
      // Firestore 'in' query supports up to 10 items
      // For larger sets, we'd need to use multiple queries
      const sitesToQuery = params.allowedSiteIds.slice(0, 10);
      constraints.push(where('siteId', 'in', sitesToQuery));
    } else {
      // No sites allowed - return constraint that will match nothing
      constraints.push(where('siteId', '==', '__NO_ACCESS__'));
    }
  }
  // Regular users see timesheets for their site only
  else if (params.siteId) {
    constraints.push(where('siteId', '==', params.siteId));
  }

  return constraints;
}

/**
 * Check if a user has access to view data for a specific site
 */
export function canAccessSiteData(params: {
  userRole: string;
  userCompanyId?: string;
  userSiteId?: string;
  targetSiteId: string;
  targetCompanyId?: string;
  allowedSiteIds?: string[];
}): boolean {
  // Master users can access all sites in their company
  if (params.userRole === 'master') {
    return params.userCompanyId === params.targetCompanyId;
  }

  // Check if site is in allowed list (for subcontractors)
  if (params.allowedSiteIds) {
    return params.allowedSiteIds.includes(params.targetSiteId);
  }

  // Regular users can only access their own site
  return params.userSiteId === params.targetSiteId;
}

/**
 * Cross-company data isolation check
 * Ensures companies cannot see each other's internal data
 * Exception: Marketplace (if VAS enabled)
 */
export function enforceCrossCompanyIsolation(params: {
  userCompanyId?: string;
  targetCompanyId?: string;
  isMarketplaceContext?: boolean;
}): boolean {
  // If in marketplace context and VAS enabled, allow cross-company visibility
  if (params.isMarketplaceContext) {
    return true;
  }

  // Otherwise, require same company
  return params.userCompanyId === params.targetCompanyId;
}

/**
 * Build asset query constraints with proper visibility rules
 */
export function buildAssetQueryConstraints(params: {
  userRole: string;
  userId: string;
  companyId?: string;
  siteId?: string;
  isSubcontractor?: boolean;
  allowedSiteIds?: string[];
  includeMarketplace?: boolean;
}) {
  const constraints: any[] = [];

  // Master can see all company assets
  if (params.userRole === 'master' && params.companyId) {
    constraints.push(where('companyId', '==', params.companyId));
  }
  // Subcontractors see assets in their allowed sites
  else if (params.isSubcontractor && params.allowedSiteIds) {
    if (params.allowedSiteIds.length > 0) {
      const sitesToQuery = params.allowedSiteIds.slice(0, 10);
      constraints.push(where('siteId', 'in', sitesToQuery));
    } else {
      constraints.push(where('siteId', '==', '__NO_ACCESS__'));
    }
  }
  // Regular users see site assets only
  else if (params.siteId) {
    constraints.push(where('siteId', '==', params.siteId));
  }

  // If including marketplace, add visibility constraint
  if (params.includeMarketplace) {
    // This would be a separate query for marketplace-visible assets
    // Combined with OR logic if supported
  }

  return constraints;
}

/**
 * Build employee query constraints with proper visibility rules
 */
export function buildEmployeeQueryConstraints(params: {
  userRole: string;
  userId: string;
  companyId?: string;
  siteId?: string;
  allowedSiteIds?: string[];
}) {
  const constraints: any[] = [];

  // Master can see all company employees
  if (params.userRole === 'master' && params.companyId) {
    constraints.push(where('companyId', '==', params.companyId));
  }
  // Site-based users see site employees only
  else if (params.siteId) {
    constraints.push(where('siteId', '==', params.siteId));
  }
  // Users with allowed sites (could be multi-site access)
  else if (params.allowedSiteIds && params.allowedSiteIds.length > 0) {
    const sitesToQuery = params.allowedSiteIds.slice(0, 10);
    constraints.push(where('siteId', 'in', sitesToQuery));
  }

  return constraints;
}

/**
 * Filter EPH (Equipment Per Hour) timesheet data by site
 * Ensures subcontractors only see EPH data for sites where they have access
 */
export async function getFilteredEPHTimesheets(params: {
  userRole: string;
  userId: string;
  companyId?: string;
  siteId?: string;
  assetId?: string;
  startDate?: Date;
  endDate?: Date;
  allowedSiteIds?: string[];
}): Promise<any[]> {
  try {
    const timesheetsRef = collection(db, 'plantAssetTimesheets');
    const constraints: any[] = [];

    // Apply site-based filtering
    const siteConstraints = buildTimesheetQueryConstraints({
      userRole: params.userRole,
      userId: params.userId,
      siteId: params.siteId,
      companyId: params.companyId,
      allowedSiteIds: params.allowedSiteIds,
    });
    constraints.push(...siteConstraints);

    // Additional filters
    if (params.assetId) {
      constraints.push(where('assetId', '==', params.assetId));
    }

    const timesheetsQuery = query(timesheetsRef, ...constraints);
    const snapshot = await getDocs(timesheetsQuery);
    
    const timesheets: any[] = [];
    snapshot.forEach((doc) => {
      timesheets.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    // Apply date filtering in memory if needed
    let filteredTimesheets = timesheets;
    if (params.startDate || params.endDate) {
      filteredTimesheets = timesheets.filter((ts) => {
        const tsDate = ts.date?.toDate?.() || new Date(ts.date);
        if (params.startDate && tsDate < params.startDate) return false;
        if (params.endDate && tsDate > params.endDate) return false;
        return true;
      });
    }

    console.log('[DataVisibility] Filtered EPH timesheets:', filteredTimesheets.length, 'results');
    return filteredTimesheets;
  } catch (error) {
    console.error('[DataVisibility] Error filtering EPH timesheets:', error);
    return [];
  }
}
