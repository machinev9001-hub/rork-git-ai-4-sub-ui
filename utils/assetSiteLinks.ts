import { collection, addDoc, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { AssetSite } from '@/types';

/**
 * Allocate an asset to a site
 * Creates a new AssetSite junction table entry
 */
export async function allocateAssetToSite(params: {
  assetId: string;
  assetName: string;
  assetType: string;
  siteId: string;
  siteName: string;
  companyId: string;
  masterAccountId: string;
  allocatedBy: string;
  allocationNotes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if asset is already allocated to this site
    const assetSitesRef = collection(db, 'assetSites');
    const existingQuery = query(
      assetSitesRef,
      where('assetId', '==', params.assetId),
      where('siteId', '==', params.siteId),
      where('isActive', '==', true)
    );
    
    const existingSnapshot = await getDocs(existingQuery);
    
    if (!existingSnapshot.empty) {
      return { 
        success: false, 
        error: 'Asset is already allocated to this site' 
      };
    }

    // Create new allocation
    await addDoc(assetSitesRef, {
      assetId: params.assetId,
      assetName: params.assetName,
      assetType: params.assetType,
      siteId: params.siteId,
      siteName: params.siteName,
      companyId: params.companyId,
      masterAccountId: params.masterAccountId,
      allocatedAt: serverTimestamp(),
      allocatedBy: params.allocatedBy,
      isActive: true,
      allocationNotes: params.allocationNotes || null,
      createdAt: serverTimestamp(),
    });

    console.log('[AssetSiteLink] Asset allocated to site:', params.assetId, '→', params.siteId);
    return { success: true };
  } catch (error) {
    console.error('[AssetSiteLink] Error allocating asset to site:', error);
    return { 
      success: false, 
      error: 'Failed to allocate asset to site' 
    };
  }
}

/**
 * Deallocate an asset from a site
 * Sets isActive to false and adds deallocation metadata
 * This makes the asset "Available" status for marketplace
 */
export async function deallocateAssetFromSite(params: {
  assetId: string;
  siteId: string;
  deallocatedBy: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const assetSitesRef = collection(db, 'assetSites');
    const allocationQuery = query(
      assetSitesRef,
      where('assetId', '==', params.assetId),
      where('siteId', '==', params.siteId),
      where('isActive', '==', true)
    );
    
    const allocationSnapshot = await getDocs(allocationQuery);
    
    if (allocationSnapshot.empty) {
      return { 
        success: false, 
        error: 'No active allocation found for this asset and site' 
      };
    }

    // Update the allocation to mark as inactive (deallocated)
    const allocationDoc = allocationSnapshot.docs[0];
    await updateDoc(doc(db, 'assetSites', allocationDoc.id), {
      isActive: false,
      deallocatedAt: serverTimestamp(),
      deallocatedBy: params.deallocatedBy,
      updatedAt: serverTimestamp(),
    });

    console.log('[AssetSiteLink] Asset deallocated from site:', params.assetId, '←', params.siteId);
    return { success: true };
  } catch (error) {
    console.error('[AssetSiteLink] Error deallocating asset from site:', error);
    return { 
      success: false, 
      error: 'Failed to deallocate asset from site' 
    };
  }
}

/**
 * Get all sites where an asset is allocated
 */
export async function getAssetSites(assetId: string): Promise<AssetSite[]> {
  try {
    const assetSitesRef = collection(db, 'assetSites');
    const sitesQuery = query(
      assetSitesRef,
      where('assetId', '==', assetId),
      where('isActive', '==', true)
    );
    
    const sitesSnapshot = await getDocs(sitesQuery);
    const sites: AssetSite[] = [];
    
    sitesSnapshot.forEach((doc) => {
      sites.push({
        id: doc.id,
        ...doc.data(),
      } as AssetSite);
    });

    return sites;
  } catch (error) {
    console.error('[AssetSiteLink] Error getting asset sites:', error);
    return [];
  }
}

/**
 * Get all assets allocated to a site
 */
export async function getSiteAssets(siteId: string): Promise<AssetSite[]> {
  try {
    const assetSitesRef = collection(db, 'assetSites');
    const assetsQuery = query(
      assetSitesRef,
      where('siteId', '==', siteId),
      where('isActive', '==', true)
    );
    
    const assetsSnapshot = await getDocs(assetsQuery);
    const assets: AssetSite[] = [];
    
    assetsSnapshot.forEach((doc) => {
      assets.push({
        id: doc.id,
        ...doc.data(),
      } as AssetSite);
    });

    return assets;
  } catch (error) {
    console.error('[AssetSiteLink] Error getting site assets:', error);
    return [];
  }
}

/**
 * Check if an asset is currently allocated to any site
 * Returns true if asset has an active allocation (siteId exists)
 * Used for marketplace real-time status
 */
export async function isAssetAllocated(assetId: string): Promise<boolean> {
  try {
    const assetSitesRef = collection(db, 'assetSites');
    const allocationQuery = query(
      assetSitesRef,
      where('assetId', '==', assetId),
      where('isActive', '==', true)
    );
    
    const allocationSnapshot = await getDocs(allocationQuery);
    return !allocationSnapshot.empty;
  } catch (error) {
    console.error('[AssetSiteLink] Error checking asset allocation:', error);
    return false;
  }
}
