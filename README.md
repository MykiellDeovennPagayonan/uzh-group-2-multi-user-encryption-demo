# Multi-User Encryption Demo

A Next.js client-side React component demonstrating multi-user encryption using RSA and AES. This demo showcases how one can encrypt data for multiple recipients and allow authorized users to decrypt the data with their private keys.

---

## Table of Contents

* [Features](#features)
* [Prerequisites](#prerequisites)
* [Installation](#installation)
* [Usage](#usage)
* [Component Structure](#component-structure)
* [API & Utilities](#api--utilities)
* [Security Notes](#security-notes)
* [Decryption Logging](#decryption-logging)
* [License](#license)

---

## Features

* Generate RSA-2048 key pairs for multiple users.
* Encrypt data with a randomly generated AES-256 key.
* Encrypt the AES key separately for each authorized user using their RSA public key.
* Decrypt data only if the user has the corresponding encrypted AES key.
* Real-time UI feedback for encryption/decryption success or failure.
* Logging of all decryption attempts (success and failure).

## Prerequisites

* Node.js v16 or later
* npm or yarn
* A Next.js project set up with `'use client'` enabled for client-side pages

## Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/MykiellDeovennPagayonan/uzh-group-2-multi-user-encryption-demo.git
   cd uzh-group-2-multi-user-encryption-demo.git
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start development server**

   ```bash
   npm run dev
   # or
   yarn dev
   ```

   The app will be available at `http://localhost:3000`.

## Usage

1. **Add Users**: Enter a name in the input field and click **Add** (or press Enter). Each user is assigned a 2048-bit RSA key pair.
2. **Encrypt Data**:

   * Type or paste the plaintext into the "Enter data to encrypt..." textarea.
   * Select the checkboxes for users who should be authorized to decrypt.
   * Click **Encrypt Data**.
   * On success, a confirmation and metadata details appear.
3. **Decrypt Data**:

   * Choose a user from the dropdown.
   * Click **Decrypt Data**.
   * On success, the decrypted plaintext will be displayed; on failure, an inline error alert appears.
4. **View Details**:

   * Expand the **Encrypted Data** card to inspect ciphertext, IV, encrypted keys per user, and metadata.
   * The **Decryption Attempts** card logs every attempt with timestamp and success status.

## Component Structure

```
/app
└── page.tsx      # Main UI component
/services
└── multiUserEncryption.ts      # Encrypt/decrypt service wrappers
/utils
└── crypto.ts                   # Key generation & helper functions
/components
└── ui                        # Reusable UI components (Button, Input, Card, Alert)
```

## Utilities

### `generateKeyPair(): KeyPair`

Generates an RSA-2048 key pair.

### `getKeyFingerprint(pubKey: string): string`

Returns a short fingerprint for display.

### `MultiUserEncryptionService.encryptForMultipleUsers(data, publicKeys, authorId): EncryptedData`

* **data**: plaintext string to encrypt
* **publicKeys**: Record of `userId -> publicKey`
* **authorId**: ID of the encrypting user

### `MultiUserEncryptionService.decryptForUser(encryptedData, userId, privateKey)`

* **encryptedData**: full `EncryptedData` object
* **userId**: ID of the user attempting to decrypt
* **privateKey**: the user’s RSA private key

Returns `{ success: boolean; data?: string; error?: string }`.

## Security Notes

* AES-256-CBC is used for data encryption with a fresh random IV.
* Each user’s AES key is encrypted under their own RSA-2048 public key—no shared secrets.
* Private keys never leave client memory.
* This demo is intended for educational purposes; for production, consider hardened key storage and secure channels.

## Decryption Logging

* All attempts (successful or failed) are recorded in component state along with timestamps.
* Customize logging to persist to server or local storage as needed.