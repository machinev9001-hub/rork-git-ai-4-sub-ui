import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { VASSubscription, VASFeatureId, VASSubscriptionState, AdminNotification, AdminNotificationType } from '@/types';

/**
 * Start a VAS subscription trial
 * Creates a subscription with TRIAL_ACTIVE state for 12 days
 */
export async function startVASTrialSubscription(
  masterAccountId: string,
  featureId: VASFeatureId,
  featureName: string,
  price: number,
  currency: string = 'USD'
): Promise<{ success: boolean; subscriptionId?: string; error?: string }> {
  try {
    console.log('[VASSubscription] Starting trial for feature:', featureId);

    // Check if subscription already exists
    const subscriptionsRef = collection(db, 'vasSubscriptions');
    const existingQuery = query(
      subscriptionsRef,
      where('masterAccountId', '==', masterAccountId),
      where('featureId', '==', featureId)
    );
    const existingSnapshot = await getDocs(existingQuery);

    if (!existingSnapshot.empty) {
      const existing = existingSnapshot.docs[0].data() as VASSubscription;
      if (existing.state !== 'INACTIVE' && existing.state !== 'SUSPENDED') {
        return { 
          success: false, 
          error: 'Subscription already exists for this feature' 
        };
      }
    }

    // Calculate trial end date (12 days from now)
    const now = new Date();
    const trialEndDate = new Date(now);
    trialEndDate.setDate(trialEndDate.getDate() + 12);

    // Create subscription
    const subscription: Omit<VASSubscription, 'id'> = {
      masterAccountId,
      featureId,
      featureName,
      state: 'TRIAL_ACTIVE',
      trialStartDate: Timestamp.fromDate(now),
      trialEndDate: Timestamp.fromDate(trialEndDate),
      price,
      currency,
      autoRenew: false,
      createdAt: serverTimestamp(),
      createdBy: masterAccountId,
    };

    const docRef = await addDoc(subscriptionsRef, subscription);
    console.log('[VASSubscription] Trial created:', docRef.id);

    // Create admin notification
    await createAdminNotification({
      type: 'VAS_SUBSCRIPTION_STARTED',
      title: 'New VAS Trial Started',
      message: `Trial subscription started for ${featureName}`,
      masterAccountId,
      vasSubscriptionId: docRef.id,
      featureId,
      priority: 'medium',
      metadata: {
        trialEndDate: trialEndDate.toISOString(),
        price,
        currency,
      },
    });

    return { success: true, subscriptionId: docRef.id };
  } catch (error) {
    console.error('[VASSubscription] Error starting trial:', error);
    return { 
      success: false, 
      error: 'Failed to start trial subscription' 
    };
  }
}

/**
 * Activate a VAS subscription with payment
 * Transitions from TRIAL_ACTIVE or PAYMENT_PENDING to ACTIVE
 */
export async function activateVASSubscription(
  subscriptionId: string,
  masterAccountId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[VASSubscription] Activating subscription:', subscriptionId);

    const subscriptionRef = doc(db, 'vasSubscriptions', subscriptionId);
    
    // Calculate next payment due (30 days from now)
    const now = new Date();
    const nextPaymentDue = new Date(now);
    nextPaymentDue.setDate(nextPaymentDue.getDate() + 30);

    await updateDoc(subscriptionRef, {
      state: 'ACTIVE',
      activationDate: serverTimestamp(),
      lastPaymentDate: serverTimestamp(),
      nextPaymentDue: Timestamp.fromDate(nextPaymentDue),
      updatedAt: serverTimestamp(),
    });

    // Get subscription details for notification
    const subscriptionSnapshot = await getDocs(
      query(collection(db, 'vasSubscriptions'), where('__name__', '==', subscriptionId))
    );
    
    if (!subscriptionSnapshot.empty) {
      const subscription = subscriptionSnapshot.docs[0].data() as VASSubscription;
      
      // Create admin notification
      await createAdminNotification({
        type: 'VAS_SUBSCRIPTION_ACTIVATED',
        title: 'VAS Subscription Activated',
        message: `Subscription activated for ${subscription.featureName}`,
        masterAccountId,
        vasSubscriptionId: subscriptionId,
        featureId: subscription.featureId,
        priority: 'low',
        metadata: {
          nextPaymentDue: nextPaymentDue.toISOString(),
        },
      });
    }

    console.log('[VASSubscription] Subscription activated successfully');
    return { success: true };
  } catch (error) {
    console.error('[VASSubscription] Error activating subscription:', error);
    return { 
      success: false, 
      error: 'Failed to activate subscription' 
    };
  }
}

/**
 * Suspend a VAS subscription
 * Transitions to SUSPENDED state
 */
export async function suspendVASSubscription(
  subscriptionId: string,
  reason: string,
  masterAccountId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[VASSubscription] Suspending subscription:', subscriptionId);

    const subscriptionRef = doc(db, 'vasSubscriptions', subscriptionId);
    
    await updateDoc(subscriptionRef, {
      state: 'SUSPENDED',
      suspensionDate: serverTimestamp(),
      suspensionReason: reason,
      updatedAt: serverTimestamp(),
    });

    // Get subscription details for notification
    const subscriptionSnapshot = await getDocs(
      query(collection(db, 'vasSubscriptions'), where('__name__', '==', subscriptionId))
    );
    
    if (!subscriptionSnapshot.empty) {
      const subscription = subscriptionSnapshot.docs[0].data() as VASSubscription;
      
      // Create admin notification
      await createAdminNotification({
        type: 'VAS_SUSPENDED',
        title: 'VAS Subscription Suspended',
        message: `Subscription suspended for ${subscription.featureName}: ${reason}`,
        masterAccountId,
        vasSubscriptionId: subscriptionId,
        featureId: subscription.featureId,
        priority: 'high',
        metadata: {
          reason,
        },
      });
    }

    console.log('[VASSubscription] Subscription suspended successfully');
    return { success: true };
  } catch (error) {
    console.error('[VASSubscription] Error suspending subscription:', error);
    return { 
      success: false, 
      error: 'Failed to suspend subscription' 
    };
  }
}

/**
 * Check and update expired trials
 * Should be called periodically (e.g., daily via Cloud Function)
 */
export async function checkAndUpdateExpiredTrials(): Promise<{
  success: boolean;
  processedCount: number;
  error?: string;
}> {
  try {
    console.log('[VASSubscription] Checking for expired trials...');

    const subscriptionsRef = collection(db, 'vasSubscriptions');
    const activeTrialsQuery = query(
      subscriptionsRef,
      where('state', '==', 'TRIAL_ACTIVE')
    );

    const snapshot = await getDocs(activeTrialsQuery);
    const now = new Date();
    let processedCount = 0;

    for (const docSnapshot of snapshot.docs) {
      const subscription = docSnapshot.data() as VASSubscription;
      const trialEndDate = subscription.trialEndDate?.toDate();

      if (trialEndDate && trialEndDate < now) {
        // Trial has expired - move to PAYMENT_PENDING
        await updateDoc(doc(db, 'vasSubscriptions', docSnapshot.id), {
          state: 'PAYMENT_PENDING',
          updatedAt: serverTimestamp(),
        });

        // Create notification
        await createAdminNotification({
          type: 'VAS_TRIAL_EXPIRED',
          title: 'VAS Trial Expired',
          message: `Trial period expired for ${subscription.featureName}. Payment now required.`,
          masterAccountId: subscription.masterAccountId,
          vasSubscriptionId: docSnapshot.id,
          featureId: subscription.featureId,
          priority: 'high',
          metadata: {
            trialEndDate: trialEndDate.toISOString(),
          },
        });

        processedCount++;
        console.log('[VASSubscription] Expired trial:', docSnapshot.id);
      } else if (trialEndDate) {
        // Check if trial is expiring soon (within 2 days)
        const daysUntilExpiry = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntilExpiry <= 2 && daysUntilExpiry > 0) {
          // Create notification about upcoming expiration
          await createAdminNotification({
            type: 'VAS_TRIAL_EXPIRING',
            title: 'VAS Trial Expiring Soon',
            message: `Trial for ${subscription.featureName} expires in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}.`,
            masterAccountId: subscription.masterAccountId,
            vasSubscriptionId: docSnapshot.id,
            featureId: subscription.featureId,
            priority: 'medium',
            metadata: {
              daysRemaining: daysUntilExpiry,
              trialEndDate: trialEndDate.toISOString(),
            },
          });
        }
      }
    }

    console.log(`[VASSubscription] Processed ${processedCount} expired trials`);
    return { success: true, processedCount };
  } catch (error) {
    console.error('[VASSubscription] Error checking expired trials:', error);
    return { 
      success: false, 
      processedCount: 0,
      error: 'Failed to check expired trials' 
    };
  }
}

/**
 * Get active VAS features for a master account
 * Returns only features in TRIAL_ACTIVE or ACTIVE state
 */
export async function getActiveVASFeatures(masterAccountId: string): Promise<VASFeatureId[]> {
  try {
    const subscriptionsRef = collection(db, 'vasSubscriptions');
    const activeQuery = query(
      subscriptionsRef,
      where('masterAccountId', '==', masterAccountId),
      where('state', 'in', ['TRIAL_ACTIVE', 'ACTIVE'])
    );

    const snapshot = await getDocs(activeQuery);
    const activeFeatures: VASFeatureId[] = snapshot.docs.map(
      doc => (doc.data() as VASSubscription).featureId
    );

    return activeFeatures;
  } catch (error) {
    console.error('[VASSubscription] Error getting active features:', error);
    return [];
  }
}

/**
 * Create an admin notification
 */
export async function createAdminNotification(
  notification: Omit<AdminNotification, 'id' | 'isRead' | 'createdAt'>
): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  try {
    console.log('[AdminNotification] Creating notification:', notification.type);

    const notificationsRef = collection(db, 'adminNotifications');
    const notificationData: Omit<AdminNotification, 'id'> = {
      ...notification,
      isRead: false,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(notificationsRef, notificationData);
    console.log('[AdminNotification] Notification created:', docRef.id);

    return { success: true, notificationId: docRef.id };
  } catch (error) {
    console.error('[AdminNotification] Error creating notification:', error);
    return { 
      success: false, 
      error: 'Failed to create admin notification' 
    };
  }
}

/**
 * Create notification when activation code is redeemed
 */
export async function notifyActivationCodeRedeemed(
  masterAccountId: string,
  masterAccountName: string,
  activationCodeId: string,
  accountType: 'enterprise' | 'free',
  companyName?: string
): Promise<void> {
  try {
    await createAdminNotification({
      type: 'ACTIVATION_CODE_REDEEMED',
      title: 'New Account Activated',
      message: `${accountType === 'enterprise' ? 'Enterprise' : 'Free'} account activated${companyName ? ` for ${companyName}` : ''}`,
      masterAccountId,
      masterAccountName,
      activationCodeId,
      priority: accountType === 'enterprise' ? 'high' : 'medium',
      metadata: {
        accountType,
        companyName,
      },
    });
  } catch (error) {
    console.error('[AdminNotification] Error notifying activation:', error);
  }
}
