/**
 * Identity Binding Provider Interface.
 * Allows an optional stage where the caretaker binds their identity
 * (e.g. OTP sent to phone/email on file with registry, or national ID match).
 */

export interface IdentityBindingChallenge {
  sessionToken: string;
  challengeType: "SMS_OTP" | "EMAIL_OTP" | "DIGITAL_ID" | "BIOMETRIC";
  targetMasked?: string;
  expiresAt: Date;
  instructions: string;
}

export interface IdentityBindingConfirmationResult {
  confirmed: boolean;
  reason?: string;
  bindingDetails?: {
    method: string;
    verifiedAt: Date;
    referenceId?: string;
  };
}

export interface IdentityBindingProvider {
  id: string;
  name: string;
  start(caseId: string, metadata?: Record<string, any>): Promise<IdentityBindingChallenge>;
  confirm(caseId: string, code: string, sessionToken: string): Promise<IdentityBindingConfirmationResult>;
}

// In-memory registry for identity providers
let activeIdentityProvider: IdentityBindingProvider | null = null;

export function registerIdentityBindingProvider(provider: IdentityBindingProvider): void {
  activeIdentityProvider = provider;
}

export function getIdentityBindingProvider(): IdentityBindingProvider | null {
  return activeIdentityProvider;
}

export function isIdentityBindingConfigured(): boolean {
  return activeIdentityProvider !== null;
}
