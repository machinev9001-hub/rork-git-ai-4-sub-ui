import { collection, addDoc, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { EmployeeSite } from '@/types';

/**
 * Link an employee to a site
 * Creates a new EmployeeSite junction table entry
 */
export async function linkEmployeeToSite(params: {
  employeeId: string;
  employeeName: string;
  siteId: string;
  siteName: string;
  companyId: string;
  masterAccountId: string;
  role?: string;
  linkedBy: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if link already exists and is active
    const employeeSitesRef = collection(db, 'employeeSites');
    const existingQuery = query(
      employeeSitesRef,
      where('employeeId', '==', params.employeeId),
      where('siteId', '==', params.siteId),
      where('isActive', '==', true)
    );
    
    const existingSnapshot = await getDocs(existingQuery);
    
    if (!existingSnapshot.empty) {
      return { 
        success: false, 
        error: 'Employee is already linked to this site' 
      };
    }

    // Create new link
    await addDoc(employeeSitesRef, {
      employeeId: params.employeeId,
      employeeName: params.employeeName,
      siteId: params.siteId,
      siteName: params.siteName,
      companyId: params.companyId,
      masterAccountId: params.masterAccountId,
      role: params.role || null,
      linkedAt: serverTimestamp(),
      linkedBy: params.linkedBy,
      isActive: true,
      createdAt: serverTimestamp(),
    });

    console.log('[EmployeeSiteLink] Employee linked to site:', params.employeeId, '→', params.siteId);
    return { success: true };
  } catch (error) {
    console.error('[EmployeeSiteLink] Error linking employee to site:', error);
    return { 
      success: false, 
      error: 'Failed to link employee to site' 
    };
  }
}

/**
 * Unlink an employee from a site
 * Sets isActive to false and adds unlink metadata
 */
export async function unlinkEmployeeFromSite(params: {
  employeeId: string;
  siteId: string;
  unlinkedBy: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const employeeSitesRef = collection(db, 'employeeSites');
    const linkQuery = query(
      employeeSitesRef,
      where('employeeId', '==', params.employeeId),
      where('siteId', '==', params.siteId),
      where('isActive', '==', true)
    );
    
    const linkSnapshot = await getDocs(linkQuery);
    
    if (linkSnapshot.empty) {
      return { 
        success: false, 
        error: 'No active link found for this employee and site' 
      };
    }

    // Update the link to mark as inactive
    const linkDoc = linkSnapshot.docs[0];
    await updateDoc(doc(db, 'employeeSites', linkDoc.id), {
      isActive: false,
      unlinkedAt: serverTimestamp(),
      unlinkedBy: params.unlinkedBy,
      updatedAt: serverTimestamp(),
    });

    console.log('[EmployeeSiteLink] Employee unlinked from site:', params.employeeId, '←', params.siteId);
    return { success: true };
  } catch (error) {
    console.error('[EmployeeSiteLink] Error unlinking employee from site:', error);
    return { 
      success: false, 
      error: 'Failed to unlink employee from site' 
    };
  }
}

/**
 * Get all sites linked to an employee
 */
export async function getEmployeeSites(employeeId: string): Promise<EmployeeSite[]> {
  try {
    const employeeSitesRef = collection(db, 'employeeSites');
    const sitesQuery = query(
      employeeSitesRef,
      where('employeeId', '==', employeeId),
      where('isActive', '==', true)
    );
    
    const sitesSnapshot = await getDocs(sitesQuery);
    const sites: EmployeeSite[] = [];
    
    sitesSnapshot.forEach((doc) => {
      sites.push({
        id: doc.id,
        ...doc.data(),
      } as EmployeeSite);
    });

    return sites;
  } catch (error) {
    console.error('[EmployeeSiteLink] Error getting employee sites:', error);
    return [];
  }
}

/**
 * Get all employees linked to a site
 */
export async function getSiteEmployees(siteId: string): Promise<EmployeeSite[]> {
  try {
    const employeeSitesRef = collection(db, 'employeeSites');
    const employeesQuery = query(
      employeeSitesRef,
      where('siteId', '==', siteId),
      where('isActive', '==', true)
    );
    
    const employeesSnapshot = await getDocs(employeesQuery);
    const employees: EmployeeSite[] = [];
    
    employeesSnapshot.forEach((doc) => {
      employees.push({
        id: doc.id,
        ...doc.data(),
      } as EmployeeSite);
    });

    return employees;
  } catch (error) {
    console.error('[EmployeeSiteLink] Error getting site employees:', error);
    return [];
  }
}
