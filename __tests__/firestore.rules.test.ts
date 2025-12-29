import { initializeTestEnvironment, assertSucceeds, assertFails, RulesTestEnvironment, RulesTestContext } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  const rulesPath = path.join(__dirname, '../firestore.rules');
  const rules = fs.readFileSync(rulesPath, 'utf8');

  testEnv = await initializeTestEnvironment({
    projectId: 'test-project',
    firestore: {
      rules,
      host: 'localhost',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe('Firestore Security Rules - Production Ready', () => {
  describe('Authentication', () => {
    test('unauthenticated users cannot read/write any data', async () => {
      const unauthedDb = testEnv.unauthenticatedContext().firestore();
      
      await assertFails(getDoc(doc(unauthedDb, 'users/user1')));
      await assertFails(setDoc(doc(unauthedDb, 'users/user1'), { name: 'Test' }));
    });

    test('authenticated users with valid auth can access their data', async () => {
      const authedDb = testEnv.authenticatedContext('user1', { companyId: 'company1' }).firestore();
      
      await testEnv.withSecurityRulesDisabled(async (context: RulesTestContext) => {
        await setDoc(doc(context.firestore(), 'users/user1'), {
          userId: 'user1',
          role: 'Admin',
          companyId: 'company1',
          siteId: 'site1',
          name: 'Test User',
          createdAt: serverTimestamp(),
        });
      });

      await assertSucceeds(getDoc(doc(authedDb, 'users/user1')));
    });
  });

  describe('Company-level Isolation', () => {
    test('users can only access documents from their company', async () => {
      const user1Db = testEnv.authenticatedContext('user1', { companyId: 'company1' }).firestore();
      const user2Db = testEnv.authenticatedContext('user2', { companyId: 'company2' }).firestore();

      await testEnv.withSecurityRulesDisabled(async (context: RulesTestContext) => {
        const db = context.firestore();
        await setDoc(doc(db, 'employees/emp1'), {
          name: 'Employee 1',
          companyId: 'company1',
          siteId: 'site1',
          masterAccountId: 'master1',
        });
        await setDoc(doc(db, 'employees/emp2'), {
          name: 'Employee 2',
          companyId: 'company2',
          siteId: 'site2',
          masterAccountId: 'master1',
        });
      });

      await assertSucceeds(getDoc(doc(user1Db, 'employees/emp1')));
      await assertFails(getDoc(doc(user2Db, 'employees/emp1')));
      await assertSucceeds(getDoc(doc(user2Db, 'employees/emp2')));
    });

    test('users cannot modify companyId field', async () => {
      const userDb = testEnv.authenticatedContext('user1', { companyId: 'company1' }).firestore();

      await testEnv.withSecurityRulesDisabled(async (context: RulesTestContext) => {
        await setDoc(doc(context.firestore(), 'employees/emp1'), {
          name: 'Employee 1',
          companyId: 'company1',
          siteId: 'site1',
          masterAccountId: 'master1',
        });
      });

      await assertFails(
        updateDoc(doc(userDb, 'employees/emp1'), {
          companyId: 'company2',
        })
      );
    });
  });

  describe('Account Type Restrictions', () => {
    test('free account users cannot access enterprise features', async () => {
      const freeUserDb = testEnv.authenticatedContext('freeUser', { 
        companyId: 'company1',
        accountType: 'free'
      }).firestore();

      await testEnv.withSecurityRulesDisabled(async (context: RulesTestContext) => {
        await setDoc(doc(context.firestore(), 'companies/company1'), {
          legalEntityName: 'Test Company',
          accountType: 'free',
          createdBy: 'freeUser',
        });
      });

      await assertFails(
        setDoc(doc(freeUserDb, 'analyticsData/report1'), {
          companyId: 'company1',
          data: {},
        })
      );
    });

    test('enterprise account users can access all features', async () => {
      const enterpriseUserDb = testEnv.authenticatedContext('enterpriseUser', { 
        companyId: 'company1',
        accountType: 'enterprise'
      }).firestore();

      await testEnv.withSecurityRulesDisabled(async (context: RulesTestContext) => {
        await setDoc(doc(context.firestore(), 'companies/company1'), {
          legalEntityName: 'Test Company',
          accountType: 'enterprise',
          createdBy: 'enterpriseUser',
        });
      });

      await assertSucceeds(
        setDoc(doc(enterpriseUserDb, 'analyticsData/report1'), {
          companyId: 'company1',
          data: {},
          createdAt: serverTimestamp(),
        })
      );
    });
  });

  describe('Role-based Access', () => {
    test('Admin can create users', async () => {
      const adminDb = testEnv.authenticatedContext('admin1', { 
        companyId: 'company1',
        role: 'Admin'
      }).firestore();

      await assertSucceeds(
        addDoc(collection(adminDb, 'users'), {
          userId: 'newUser',
          role: 'Supervisor',
          companyId: 'company1',
          siteId: 'site1',
          name: 'New User',
          createdAt: serverTimestamp(),
        })
      );
    });

    test('non-Admin cannot create users', async () => {
      const supervisorDb = testEnv.authenticatedContext('supervisor1', { 
        companyId: 'company1',
        role: 'Supervisor'
      }).firestore();

      await assertFails(
        addDoc(collection(supervisorDb, 'users'), {
          userId: 'newUser',
          role: 'Supervisor',
          companyId: 'company1',
          siteId: 'site1',
          name: 'New User',
          createdAt: serverTimestamp(),
        })
      );
    });
  });

  describe('Field Validation', () => {
    test('users document must have required fields', async () => {
      const adminDb = testEnv.authenticatedContext('admin1', { 
        companyId: 'company1',
        role: 'Admin'
      }).firestore();

      await assertFails(
        addDoc(collection(adminDb, 'users'), {
          name: 'User without required fields',
        })
      );

      await assertSucceeds(
        addDoc(collection(adminDb, 'users'), {
          userId: 'user1',
          role: 'Supervisor',
          companyId: 'company1',
          siteId: 'site1',
          name: 'Complete User',
          createdAt: serverTimestamp(),
        })
      );
    });

    test('companies document must have accountType field', async () => {
      const adminDb = testEnv.authenticatedContext('admin1', { 
        companyId: 'company1',
        role: 'Admin'
      }).firestore();

      await assertFails(
        addDoc(collection(adminDb, 'companies'), {
          legalEntityName: 'Test Company',
          createdBy: 'admin1',
        })
      );

      await assertSucceeds(
        addDoc(collection(adminDb, 'companies'), {
          legalEntityName: 'Test Company',
          accountType: 'enterprise',
          createdBy: 'admin1',
          createdAt: serverTimestamp(),
        })
      );
    });
  });

  describe('Master Account Access', () => {
    test('master accounts can access all their companies', async () => {
      const masterDb = testEnv.authenticatedContext('master1', { 
        role: 'master',
        companyIds: ['company1', 'company2']
      }).firestore();

      await testEnv.withSecurityRulesDisabled(async (context: RulesTestContext) => {
        const db = context.firestore();
        await setDoc(doc(db, 'sites/site1'), {
          name: 'Site 1',
          companyId: 'company1',
          masterAccountId: 'master1',
        });
        await setDoc(doc(db, 'sites/site2'), {
          name: 'Site 2',
          companyId: 'company2',
          masterAccountId: 'master1',
        });
      });

      await assertSucceeds(getDoc(doc(masterDb, 'sites/site1')));
      await assertSucceeds(getDoc(doc(masterDb, 'sites/site2')));
    });

    test('master accounts cannot access other master accounts data', async () => {
      const master1Db = testEnv.authenticatedContext('master1', { 
        role: 'master',
        companyIds: ['company1']
      }).firestore();

      await testEnv.withSecurityRulesDisabled(async (context: RulesTestContext) => {
        await setDoc(doc(context.firestore(), 'sites/site2'), {
          name: 'Site 2',
          companyId: 'company2',
          masterAccountId: 'master2',
        });
      });

      await assertFails(getDoc(doc(master1Db, 'sites/site2')));
    });
  });
});
