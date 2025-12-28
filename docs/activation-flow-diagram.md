# Account Creation Flow - Visual Diagram

## Complete Flow with Auto-Generated Activation Codes

```
┌─────────────────────────────────────────────────────────────────┐
│                    Account Type Selection                        │
│                  (account-type-selection.tsx)                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                    User selects account type
                              │
                ┌─────────────┴──────────────┐
                │                            │
        ┌───────▼──────┐            ┌───────▼──────┐
        │  Enterprise  │            │     Free     │
        │   Account    │            │   Account    │
        └───────┬──────┘            └───────┬──────┘
                │                            │
                │  Store: 'enterprise'       │  Store: 'free'
                │  in AsyncStorage           │  in AsyncStorage
                │                            │
                └─────────────┬──────────────┘
                              │
                    Navigate to /activate
                              │
┌─────────────────────────────▼─────────────────────────────────┐
│                    Activation Screen                           │
│                      (activate.tsx)                            │
└────────────────────────────────────────────────────────────────┘
                              │
                   Load account type from storage
                              │
                ┌─────────────┴──────────────┐
                │                            │
        ┌───────▼──────┐            ┌───────▼──────┐
        │  Enterprise  │            │     Free     │
        │   Account    │            │   Account    │
        └───────┬──────┘            └───────┬──────┘
                │                            │
                │                            │
    ┌───────────▼───────────┐   ┌────────────▼──────────────┐
    │  Show empty input     │   │  Auto-generate code       │
    │  field for manual     │   │  via Firebase             │
    │  activation code      │   │                           │
    │  entry                │   │  createFreeAccount        │
    │                       │   │  ActivationCode()         │
    │  User types code      │   │                           │
    │  manually             │   │  Show loading spinner     │
    └───────────┬───────────┘   └────────────┬──────────────┘
                │                            │
                │                            │
                │                   ┌────────▼─────────┐
                │                   │  Pre-fill input  │
                │                   │  with generated  │
                │                   │  code (read-only)│
                │                   │                  │
                │                   │  Gray background │
                │                   │  to indicate     │
                │                   │  non-editable    │
                │                   └────────┬─────────┘
                │                            │
    ┌───────────▼───────────┐   ┌────────────▼──────────────┐
    │  Show help text:      │   │  Show help text:          │
    │  "Contact admin for   │   │  "Auto-generated for      │
    │   activation code"    │   │   your Free account"      │
    └───────────┬───────────┘   └────────────┬──────────────┘
                │                            │
                └─────────────┬──────────────┘
                              │
                    User taps "Continue"
                              │
                  ┌───────────▼────────────┐
                  │  Validate activation   │
                  │  code with Firebase    │
                  │                        │
                  │  validateActivation    │
                  │  Code()                │
                  └───────────┬────────────┘
                              │
                    ┌─────────┴──────────┐
                    │                    │
            ┌───────▼──────┐     ┌──────▼───────┐
            │   Valid      │     │   Invalid    │
            └───────┬──────┘     └──────┬───────┘
                    │                    │
                    │              Show error alert
                    │                    │
                    │              Return to input
                    │
      ┌─────────────▼──────────────┐
      │  Store activation data in  │
      │  AsyncStorage:             │
      │  - codeId                  │
      │  - code                    │
      │  - companyName             │
      │  - companyId               │
      │  - accountType             │
      │  - validatedAt             │
      └─────────────┬──────────────┘
                    │
         Navigate to /setup-master-pin
                    │
┌───────────────────▼────────────────────────────────────────────┐
│                    Setup Master PIN                            │
│                  (setup-master-pin.tsx)                        │
│                                                                │
│  User enters:                                                  │
│  - Master Name                                                 │
│  - Master User ID                                              │
│  - PIN                                                         │
│  - Confirm PIN                                                 │
│                                                                │
│  Calls createMasterAccount() with:                            │
│  - name, masterId, pin, activationCode, accountType           │
└───────────────────┬────────────────────────────────────────────┘
                    │
         Navigate to /company-setup
                    │
                    ▼
              Master Account Created!
```

## Key Differences Between Account Types

### Enterprise Account Activation
```
┌──────────────────────────┐
│  User Action Required:   │
│  Manually enter          │
│  activation code from    │
│  administrator           │
└──────────────────────────┘
```

### Free Account Activation
```
┌──────────────────────────┐
│  Automated:              │
│  System generates and    │
│  pre-fills code          │
│  User just taps Continue │
└──────────────────────────┘
```

## Data Flow

```
Account Type Selection
         │
         ▼
    AsyncStorage (@selected_account_type)
         │
         ▼
  Activation Screen (reads account type)
         │
         ▼ (if free account)
    Generate Code
         │
         ▼
    Firebase (activation_codes collection)
         │
         ├─ code: "XXXX-XXXX-XXXX-XXXX"
         ├─ companyName: "Free Account"
         ├─ status: "active"
         ├─ maxRedemptions: 1
         └─ currentRedemptions: 0
         │
         ▼
    AsyncStorage (@activation_data)
         │
         ├─ codeId
         ├─ code
         ├─ companyName
         ├─ accountType
         └─ validatedAt
         │
         ▼
    Setup Master PIN
         │
         ▼
    createMasterAccount()
         │
         ▼
    Firebase (masterAccounts collection)
         │
         ├─ masterId
         ├─ name
         ├─ pin (hashed)
         ├─ activationCodeId
         ├─ accountType: 'free' or 'enterprise'
         └─ vasFeatures: []
```

## State Management in activate.tsx

```javascript
State Variables:
├─ activationCode: string
│  ├─ Empty for enterprise (user fills)
│  └─ Pre-filled for free (auto-generated)
│
├─ accountType: 'enterprise' | 'free'
│  └─ Loaded from AsyncStorage
│
├─ isLoading: boolean
│  └─ True during validation
│
└─ isGeneratingCode: boolean
   └─ True while generating code for free accounts

UI States:
├─ Generating (free only)
│  └─ Shows: ActivityIndicator + "Generating activation code..."
│
├─ Ready
│  ├─ Enterprise: Empty editable input
│  └─ Free: Pre-filled read-only input (gray background)
│
└─ Loading
   └─ Shows: ActivityIndicator in button
```
