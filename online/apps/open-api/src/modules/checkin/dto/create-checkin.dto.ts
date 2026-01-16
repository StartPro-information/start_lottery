export class CreateCheckinDto {
  nonce: string;
  expiresAt: number;
  sig?: string;
  deviceId?: string;
  participantIdentity?: string;
  participantFields?: Record<string, string>;
}
