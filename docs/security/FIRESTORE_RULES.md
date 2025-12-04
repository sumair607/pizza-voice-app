# Recommended Firestore Security Rules for pizza-voice-app

This file contains suggested Firestore security rules to protect shop settings and orders. These are guidelines — adapt them to your auth model and test thoroughly before deploying.

Important notes:
- Client code currently writes directly to Firestore (`saveSettings`, `saveOrderToHistory`, `updateOrderStatusInHistory`). Relying purely on client-side checks is not secure.
- Use Firebase Authentication or Callable Cloud Functions for privileged operations (settings changes, admin actions).

Example rules (Firestore rules language):

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Allow reading shop settings and orders to anyone (adjust as needed)
    match /shops/{shopId}/settings/{docId} {
      allow read: if true;

      // Only allow write when authenticated and has an admin custom claim OR using a server-side token
      allow write: if request.auth != null && request.auth.token.admin == true;
    }

    match /shops/{shopId}/orders/{orderId} {
      // Anyone can create an order (unauthenticated allowed), but the content should be validated
      allow create: if validateOrder(request.resource.data);

      // Allow reading orders if authenticated or if the order is public
      allow read: if true;

      // Allow updates only to change `status` by authenticated admin users (e.g., staff)
      allow update: if request.auth != null && request.auth.token.admin == true &&
                    request.resource.data.keys().hasOnly(['status']) &&
                    request.resource.data.status is string;

      // Prevent deletes from clients
      allow delete: if false;
    }

    // Helper function to validate an order payload
    function validateOrder(data) {
      return data.keys().hasAll(['customerName','address','whatsappNumber','items','total','paymentMethod','orderTimestamp'])
             && data.customerName is string && data.address is string
             && data.whatsappNumber is string && data.items is list
             && data.total is number && data.paymentMethod is string;
    }
  }
}
```

Recommendations:
- Use Firebase Authentication and assign an `admin` custom claim to staff accounts (set via Admin SDK).
- For sensitive operations (creating shops, changing `shopInfo.adminKey`, etc.), implement Cloud Functions that verify server-side credentials and perform writes — do not allow clients to write these fields directly.
- Add rate-limiting and input validation on server side to avoid abuse (spam orders).
- Review and test rules using the Firebase Rules Simulator before publishing.
