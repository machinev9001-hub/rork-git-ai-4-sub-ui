import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';

const FACE_TEMPLATE_KEY = '@face_templates';
const SITE_TEMPLATES_CACHE_KEY = '@site_face_templates';

export type EncryptedTemplate = {
  userId: string;
  userName: string;
  encryptedEmbedding: string;
  encryptionSalt: string;
  version: number;
  enrolledAt: string;
  isActive: boolean;
  facePhotoUri?: string;
};

function simpleEncrypt(data: number[], salt: string): string {
  const dataStr = JSON.stringify(data);
  const saltBytes = new TextEncoder().encode(salt);
  const dataBytes = new TextEncoder().encode(dataStr);
  
  const encrypted = new Uint8Array(dataBytes.length);
  for (let i = 0; i < dataBytes.length; i++) {
    encrypted[i] = dataBytes[i] ^ saltBytes[i % saltBytes.length];
  }
  
  return btoa(String.fromCharCode(...encrypted));
}

function simpleDecrypt(encrypted: string, salt: string): number[] {
  const saltBytes = new TextEncoder().encode(salt);
  const encryptedBytes = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
  
  const decrypted = new Uint8Array(encryptedBytes.length);
  for (let i = 0; i < encryptedBytes.length; i++) {
    decrypted[i] = encryptedBytes[i] ^ saltBytes[i % saltBytes.length];
  }
  
  const dataStr = new TextDecoder().decode(decrypted);
  return JSON.parse(dataStr);
}

function generateSalt(): string {
  const array = new Uint8Array(32);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return btoa(String.fromCharCode(...array));
}

export async function saveLocalTemplate(
  userId: string,
  userName: string,
  embedding: number[],
  masterAccountId: string,
  companyId?: string,
  siteId?: string,
  facePhotoUri?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[SecureFaceStore] Saving face template for user:', userId);
    
    const salt = generateSalt();
    const encrypted = simpleEncrypt(embedding, salt);
    
    const template: EncryptedTemplate = {
      userId,
      userName,
      encryptedEmbedding: encrypted,
      encryptionSalt: salt,
      version: 1,
      enrolledAt: new Date().toISOString(),
      isActive: true,
      facePhotoUri: facePhotoUri,
    };
    
    const storedTemplates = await AsyncStorage.getItem(FACE_TEMPLATE_KEY);
    const templates: EncryptedTemplate[] = storedTemplates ? JSON.parse(storedTemplates) : [];
    
    const existingIndex = templates.findIndex(t => t.userId === userId);
    if (existingIndex >= 0) {
      templates[existingIndex] = template;
    } else {
      templates.push(template);
    }
    
    await AsyncStorage.setItem(FACE_TEMPLATE_KEY, JSON.stringify(templates));
    console.log('[SecureFaceStore] Template saved locally');
    
    try {
      const templatesRef = collection(db, 'faceTemplates');
      const existingQuery = query(templatesRef, where('userId', '==', userId), where('masterAccountId', '==', masterAccountId));
      const existing = await getDocs(existingQuery);
      
      if (!existing.empty) {
        const existingDoc = existing.docs[0];
        await updateDoc(doc(db, 'faceTemplates', existingDoc.id), {
          userName,
          encryptedEmbedding: encrypted,
          encryptionSalt: salt,
          version: 1,
          isActive: true,
          facePhotoUri: facePhotoUri || null,
          updatedAt: serverTimestamp(),
        });
        console.log('[SecureFaceStore] Template updated in Firestore');
      } else {
        await addDoc(templatesRef, {
          userId,
          userName,
          encryptedEmbedding: encrypted,
          encryptionSalt: salt,
          enrolledAt: serverTimestamp(),
          enrolledBy: userId,
          version: 1,
          isActive: true,
          facePhotoUri: facePhotoUri || null,
          masterAccountId,
          companyId: companyId || null,
          siteId: siteId || null,
          createdAt: serverTimestamp(),
        });
        console.log('[SecureFaceStore] Template saved to Firestore');
      }
    } catch (firestoreError) {
      console.warn('[SecureFaceStore] Firestore save failed (offline?):', firestoreError);
    }
    
    return { success: true };
  } catch (error) {
    console.error('[SecureFaceStore] Error saving template:', error);
    return { success: false, error: 'Failed to save face template' };
  }
}

export async function getLocalTemplate(userId: string): Promise<EncryptedTemplate | null> {
  try {
    console.log('[SecureFaceStore] Getting face template for user:', userId);
    
    const storedTemplates = await AsyncStorage.getItem(FACE_TEMPLATE_KEY);
    if (!storedTemplates) {
      console.log('[SecureFaceStore] No templates found locally, checking Firestore...');
      
      try {
        const templatesRef = collection(db, 'faceTemplates');
        const q = query(templatesRef, where('userId', '==', userId), where('isActive', '==', true));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          const data = doc.data();
          const template: EncryptedTemplate = {
            userId: data.userId,
            userName: data.userName,
            encryptedEmbedding: data.encryptedEmbedding,
            encryptionSalt: data.encryptionSalt,
            version: data.version || 1,
            enrolledAt: data.enrolledAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            isActive: data.isActive,
            facePhotoUri: data.facePhotoUri,
          };
          
          const templates: EncryptedTemplate[] = [];
          templates.push(template);
          await AsyncStorage.setItem(FACE_TEMPLATE_KEY, JSON.stringify(templates));
          console.log('[SecureFaceStore] Template cached from Firestore');
          
          return template;
        }
      } catch (firestoreError) {
        console.warn('[SecureFaceStore] Firestore fetch failed (offline?):', firestoreError);
      }
      
      return null;
    }
    
    const templates: EncryptedTemplate[] = JSON.parse(storedTemplates);
    const template = templates.find(t => t.userId === userId && t.isActive);
    
    if (template) {
      console.log('[SecureFaceStore] Template found locally');
    } else {
      console.log('[SecureFaceStore] No active template found for user');
    }
    
    return template || null;
  } catch (error) {
    console.error('[SecureFaceStore] Error getting template:', error);
    return null;
  }
}

export async function decryptAndGetEmbedding(template: EncryptedTemplate): Promise<number[]> {
  try {
    console.log('[SecureFaceStore] Decrypting embedding');
    const embedding = simpleDecrypt(template.encryptedEmbedding, template.encryptionSalt);
    console.log('[SecureFaceStore] Embedding decrypted successfully, length:', embedding.length);
    return embedding;
  } catch (error) {
    console.error('[SecureFaceStore] Error decrypting embedding:', error);
    throw new Error('Failed to decrypt face template');
  }
}

export async function deleteLocalTemplate(userId: string): Promise<void> {
  try {
    console.log('[SecureFaceStore] Deleting face template for user:', userId);
    
    const storedTemplates = await AsyncStorage.getItem(FACE_TEMPLATE_KEY);
    if (storedTemplates) {
      const templates: EncryptedTemplate[] = JSON.parse(storedTemplates);
      const filtered = templates.filter(t => t.userId !== userId);
      await AsyncStorage.setItem(FACE_TEMPLATE_KEY, JSON.stringify(filtered));
    }
    
    console.log('[SecureFaceStore] Template deleted locally');
  } catch (error) {
    console.error('[SecureFaceStore] Error deleting template:', error);
  }
}

export async function hasLocalTemplate(userId: string): Promise<boolean> {
  const template = await getLocalTemplate(userId);
  return template !== null;
}

export async function syncSiteTemplatesForOffline(
  siteId: string,
  masterAccountId: string
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    console.log('[SecureFaceStore] Syncing site templates for offline use:', siteId);
    
    const templatesRef = collection(db, 'faceTemplates');
    const q = query(
      templatesRef,
      where('siteId', '==', siteId),
      where('masterAccountId', '==', masterAccountId),
      where('isActive', '==', true)
    );
    const snapshot = await getDocs(q);

    const siteTemplates: EncryptedTemplate[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      const template: EncryptedTemplate = {
        userId: data.userId,
        userName: data.userName,
        encryptedEmbedding: data.encryptedEmbedding,
        encryptionSalt: data.encryptionSalt,
        version: data.version || 1,
        enrolledAt: data.enrolledAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        isActive: data.isActive,
        facePhotoUri: data.facePhotoUri,
      };
      siteTemplates.push(template);
    });

    await AsyncStorage.setItem(
      `${SITE_TEMPLATES_CACHE_KEY}_${siteId}`,
      JSON.stringify({
        siteId,
        masterAccountId,
        templates: siteTemplates,
        syncedAt: new Date().toISOString(),
      })
    );

    console.log(
      '[SecureFaceStore] Site templates synced:',
      siteTemplates.length,
      'templates cached for offline use'
    );
    return { success: true, count: siteTemplates.length };
  } catch (error) {
    console.error('[SecureFaceStore] Error syncing site templates:', error);
    return { success: false, count: 0, error: 'Failed to sync site templates' };
  }
}

export async function invalidateUserTemplate(userId: string): Promise<void> {
  try {
    console.log('[SecureFaceStore] Invalidating template for user:', userId);
    
    const storedTemplates = await AsyncStorage.getItem(FACE_TEMPLATE_KEY);
    if (storedTemplates) {
      const templates: EncryptedTemplate[] = JSON.parse(storedTemplates);
      const updated = templates.map(t => 
        t.userId === userId ? { ...t, isActive: false } : t
      );
      await AsyncStorage.setItem(FACE_TEMPLATE_KEY, JSON.stringify(updated));
    }

    const keys = await AsyncStorage.getAllKeys();
    const siteKeys = keys.filter(key => key.startsWith(SITE_TEMPLATES_CACHE_KEY));
    
    for (const key of siteKeys) {
      const cacheData = await AsyncStorage.getItem(key);
      if (cacheData) {
        const cache = JSON.parse(cacheData);
        cache.templates = cache.templates.map((t: EncryptedTemplate) =>
          t.userId === userId ? { ...t, isActive: false } : t
        );
        await AsyncStorage.setItem(key, JSON.stringify(cache));
      }
    }
    
    console.log('[SecureFaceStore] Template invalidated in all caches');
  } catch (error) {
    console.error('[SecureFaceStore] Error invalidating template:', error);
  }
}
