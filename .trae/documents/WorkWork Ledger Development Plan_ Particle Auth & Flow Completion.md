Based on the analysis of the existing code and the provided requirements, I have developed a comprehensive plan to implement the missing **Particle Network Integration** and verify the **Payment & Dashboard** flows.

The existing codebase already has a robust implementation for:
- **Dashboard**: Backend services and frontend charts are implemented and connected.
- **Crypto Payments**: Alchemy webhook handlers and invoice matching logic are present.
- **Database**: Core schemas for Users, Invoices, and Ledger Entries are ready.

The main missing piece is the **Particle Network Authentication** flow described in your diagram.

### **Phase 1: Database Schema Update**
- **Action**: Update `prisma/schema.prisma` to add `particleUuid` field to the `User` model.
- **Reason**: To link Particle social logins (Twitter/Google/etc.) to the internal User record.

### **Phase 2: Particle Network Integration (Frontend)**
- **Action**: Install `@particle-network/auth-core-modal` and `@particle-network/chains`.
- **Action**: Create `src/components/auth/particle-provider.tsx` to initialize the SDK.
- **Action**: Create `src/components/auth/login-button.tsx` to handle the "Connect with Social" flow.
- **Action**: Update the login page to include this new authentication method.

### **Phase 3: Backend Authentication Logic**
- **Action**: Add a new tRPC procedure `auth.loginWithParticle`.
- **Logic**:
    1.  Receive the Particle User Info (UUID, Email, Wallets) from the frontend.
    2.  Find or Create a user in the database based on `email` or `particleUuid`.
    3.  Automatically create/update `WalletAddress` records for the user (Arbitrum/Base/Polygon) as per the diagram.
    4.  Return a session token (JWT) to log the user in.

### **Phase 4: Configuration & Documentation**
- **Action**: Update `.env.example` with required Particle API keys (`NEXT_PUBLIC_PARTICLE_PROJECT_ID`, etc.).
- **Action**: Add a TODO checklist for you to fill in the actual keys from the Particle Dashboard.

### **Phase 5: Verification**
- **Action**: Verify the "Payment -> Webhook -> Ledger" flow by reviewing the `alchemy-webhook.handler.ts` (already analyzed, looks good) and ensuring the `WalletAddress` creation in Phase 3 aligns with what the webhook expects.

I will start by updating the schema and installing the necessary dependencies.
