# Firebase setup for Halloween customer dashboard

## 1. Create a Firebase project

1. Open [Firebase Console](https://console.firebase.google.com/) and create a project.
2. Add a **Web** app and copy its config into `firebase-config.js`.
3. Create a **Cloud Firestore** database (production mode is fine — deploy rules next).
4. You do **not** need Firebase Authentication passwords for this dashboard.

## 2. Deploy security rules

```bash
firebase use halloween-fa7cf
firebase deploy --only firestore:rules
```

## 3. Authorize a customer email (required)

In Firestore, create:

| Collection | Document ID | Fields |
|---|---|---|
| `authorizedEmails` | email in **lowercase** | `email` (string), `active` (boolean `true`) |

Example:

```
authorizedEmails/mehihamza1@gmail.com
  email: "mehihamza1@gmail.com"
  active: true
```

## 4. How customers sign in

1. Open `https://novexahub.live/halloween/dashboard/`
2. Enter their authorized email → **Enter**
3. If the email is not in `authorizedEmails` with `active: true`, they see **Access denied**

No password. No magic link. Access is based only on the Firestore allowlist.

## 5. Collections

| Collection | Doc ID | Access |
|---|---|---|
| `authorizedEmails` | lowercased email | Get by ID for login check. Writes: Console only |
| `customers` | lowercased email | Only if that email is authorized |
| `publicInvites` | random `publicId` | Read: anyone (guests). Write: only for an authorized owner email |
