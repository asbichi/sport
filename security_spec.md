# Firebase Security Rules Specification

This document defines the security boundaries, data invariants, and threat vectors for the application's Firestore database.

## 1. Data Invariants

1. **User Profiles (`/Users/{userId}`)**
   - Must be strictly owner-writeable: Only the authenticated user matching `userId` can create or update their own profile.
   - Any user can read profiles (or signed-in users only).
2. **Products (`/Products/{productId}`)**
   - Publicly readable: Anyone (guests and logged-in users) can view, search, and load products.
   - Restricted writes: Insertion, modification, and deletion are allowed by administrators or during authorized seeding.
3. **Wishlists (`/Wishlists/{wishlistId}`)**
   - Strictly private: A user can only view, create, or delete their own wishlist records (`user_id == request.auth.uid`).
4. **Orders (`/Orders/{orderId}`)**
   - Integrity of ownership: A user can only create order records where the `user_id` matches their own `uid`.
   - Admin oversight: Admins can read all orders, but regular users can only read their own orders.
5. **Reviews (`/Reviews/{reviewId}`)**
   - Publicly readable: Product reviews are visible to all users.
   - Valid structure: Anyone can submit a review with rating and comment, but it must be formatted correctly.

---

## 2. The "Dirty Dozen" Threats & Payloads

The following 12 payloads represent malicious attempts to bypass identity, integrity, and state constraints. Our `firestore.rules` will guarantee all of these are rejected with `PERMISSION_DENIED`.

### Pillar: Identity & Spoofing
1. **Unauthenticated User Profile Creation**
   - *Attempt*: Create `/Users/victim_uid` with guest credentials.
   - *Result*: `PERMISSION_DENIED`.

2. **Cross-User Profile Hijacking**
   - *Attempt*: Authenticated as `userA_uid`, attempting to overwrite `/Users/userB_uid`.
   - *Result*: `PERMISSION_DENIED`.

3. **Spoofing Wishlist Owner**
   - *Attempt*: Creating a wishlist entry on behalf of another user: `{ "user_id": "other_user_uid", "product_id": "prod_123" }`.
   - *Result*: `PERMISSION_DENIED`.

4. **Spoofing Order Creator**
   - *Attempt*: Creating an order record belonging to another customer: `{ "order_id": "ord_111", "user_id": "victim_uid", "product_id": "prod_123", "quantity": 1 }`.
   - *Result*: `PERMISSION_DENIED`.

### Pillar: Integrity & Typos/Format
5. **Product Price Infiltration (Type Mismatch)**
   - *Attempt*: Inserting a product where `price` is a string to cause runtime UI crashes: `{ "product_name": "Bad Product", "price": "999.00" }`.
   - *Result*: `PERMISSION_DENIED`.

6. **Rating Out-of-Bounds**
   - *Attempt*: Creating a review with a 10-star rating: `{ "product_id": "p1", "reviewer_name": "Hacker", "rating": 10, "comment": "Amazing" }`.
   - *Result*: `PERMISSION_DENIED`.

7. **Negative Order Quantity**
   - *Attempt*: Placing an order with negative items: `{ "order_id": "ord_2", "product_id": "p1", "quantity": -5, "total_price": -50.00 }`.
   - *Result*: `PERMISSION_DENIED`.

### Pillar: Size & Vector Attacks
8. **Junk ID Poisoning Attack**
   - *Attempt*: Creating a document in `Products` using a 100KB character string as the document ID to inflate DB indexing costs.
   - *Result*: `PERMISSION_DENIED`.

9. **Review Comment Spam Bloat**
   - *Attempt*: Submitting a review with a 50MB comment string.
   - *Result*: `PERMISSION_DENIED` due to size enforcement limits on comment properties (`data.comment.size() <= 2000`).

10. **Shadow Fields Injection**
    - *Attempt*: Creating a User profile with unauthorized extra keys (e.g. `{ "full_name": "Bob", "email": "bob@abc.com", "isAdmin": true, "credit": 9999 }`).
    - *Result*: `PERMISSION_DENIED`.

### Pillar: State Isolation
11. **Malicious Product Price Change**
    - *Attempt*: A guest trying to change a product's price.
    - *Result*: `PERMISSION_DENIED`.

12. **Malicious Review Removal**
    - *Attempt*: A guest attempting to delete reviews submitted by other buyers.
    - *Result*: `PERMISSION_DENIED`.

---

## 3. Test Runner Verifier

Below is a conceptual code mock showcasing how these scenarios are validated against the Rules simulator.

```ts
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';

describe('Firestore Security Rules Testing', () => {
    let testEnv;

    beforeAll(async () => {
        testEnv = await initializeTestEnvironment({
            projectId: 'ai-studio-cdccca08-2ac6-4597-81c5-128162b16921',
            firestore: { rules: 'firestore.rules' }
        });
    });

    afterAll(async () => {
        await testEnv.cleanup();
    });

    it('denies unauthenticated profile writing', async () => {
        const db = testEnv.unauthenticatedContext().firestore();
        await assertFails(db.collection('Users').doc('user1').set({ full_name: 'test', email: 'test@test.com' }));
    });

    it('allows owner to read/write profile', async () => {
        const db = testEnv.authenticatedContext('user1').firestore();
        await assertSucceeds(db.collection('Users').doc('user1').set({ full_name: 'test', email: 'test@test.com' }));
    });
});
```
