import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes, createHmac } from 'crypto';
import { Participant } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CheckinService {
  constructor(private readonly prisma: PrismaService) {}

  private allowQrCheckin() {
    return (process.env.ALLOW_QR_CHECKIN ?? 'true').toLowerCase() !== 'false';
  }

  private antiSpoofEnabled() {
    return (process.env.ANTI_SPOOF_CHECKIN ?? 'true').toLowerCase() !== 'false';
  }

  private getSecret() {
    const secret = process.env.CHECKIN_HMAC_SECRET;
    if (!secret) {
      throw new BadRequestException('CHECKIN_SECRET_MISSING');
    }
    return secret;
  }

  private sign(eventId: string, nonce: string, expiresAt: number) {
    return createHmac('sha256', this.getSecret())
      .update(`${eventId}|${nonce}|${expiresAt}`)
      .digest('hex');
  }

  async getToken(tenantId: string, eventId: string) {
    if (!this.allowQrCheckin()) {
      throw new BadRequestException('ENTITLEMENT_QR_DISABLED');
    }

    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId },
      select: {
        id: true,
        requiredFields: true,
        participantMode: true,
        locked: true,
        checkinDeviceLimit: true,
      },
    });

    if (!event) {
      throw new NotFoundException('event not found');
    }

    const nonce = randomBytes(12).toString('hex');
    const expiresAt = Date.now() + 2 * 60 * 1000;
    const sig = this.sign(eventId, nonce, expiresAt);

    const qrUrl = `/checkin?event_id=${eventId}&nonce=${nonce}&expires_at=${expiresAt}&sig=${sig}`;

    return {
      nonce,
      expires_at: expiresAt,
      sig,
      qr_url: qrUrl,
    };
  }

  async checkin(
    tenantId: string,
    eventId: string,
    nonce: string,
    expiresAt: number,
    sig: string | undefined,
    deviceId: string | undefined,
    participantIdentity?: string,
    participantFields?: Record<string, string>,
  ) {
    if (!this.allowQrCheckin()) {
      throw new BadRequestException('ENTITLEMENT_QR_DISABLED');
    }

    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId },
      select: {
        id: true,
        requiredFields: true,
        participantMode: true,
        locked: true,
        checkinDeviceLimit: true,
      },
    });

    if (!event) {
      throw new NotFoundException('event not found');
    }

    if (this.antiSpoofEnabled()) {
      if (!sig) {
        throw new BadRequestException('CHECKIN_TOKEN_INVALID_SIG');
      }
      const expected = this.sign(eventId, nonce, expiresAt);
      if (expected !== sig) {
        throw new BadRequestException('CHECKIN_TOKEN_INVALID_SIG');
      }
      if (Date.now() > expiresAt) {
        throw new BadRequestException('CHECKIN_TOKEN_EXPIRED');
      }
    }

    const normalizedDeviceId = deviceId?.trim();
    const now = new Date();
    if (event.checkinDeviceLimit) {
      if (!normalizedDeviceId) {
        throw new BadRequestException('DEVICE_ID_REQUIRED');
      }
      const deviceRecord = await this.prisma.checkinDevice.findUnique({
        where: {
          tenantId_eventId_deviceId: {
            tenantId,
            eventId,
            deviceId: normalizedDeviceId,
          },
        },
      });
      if (deviceRecord) {
        const diffMs = now.getTime() - deviceRecord.lastCheckinAt.getTime();
        if (diffMs < 2 * 60 * 60 * 1000) {
          return {
            checked_in: false,
            reason: 'device_recent',
            last_checkin_at: deviceRecord.lastCheckinAt,
          };
        }
      }
    }

    const requiredFields = Array.isArray(event.requiredFields)
      ? event.requiredFields.filter((field): field is string => typeof field === 'string')
      : [];
    const participantMode = event.participantMode ?? 'csv';
    if (event.locked && participantMode === 'checkin') {
      throw new BadRequestException('EVENT_LOCKED');
    }
    let participant: Participant | null = null;

    if (participantFields && Object.keys(participantFields).length > 0) {
      const fieldMap: Record<string, string> = {
        display_name: 'displayName',
        unique_key: 'uniqueKey',
        employee_id: 'employeeId',
        email: 'email',
        username: 'username',
        department: 'department',
        title: 'title',
        org_path: 'orgPath',
        custom_field: 'customField',
      };
      const normalizedRequired = requiredFields.length ? requiredFields : ['display_name'];
      const missing = normalizedRequired.filter((field) => !participantFields?.[field]?.trim());
      if (missing.length > 0) {
        throw new BadRequestException('participant_fields_missing');
      }
      const andFilters = normalizedRequired
        .map((field) => {
          const key = fieldMap[field];
          const value = participantFields?.[field]?.trim();
          if (!key || !value) return null;
          return { [key]: value };
        })
        .filter(Boolean) as Record<string, string>[];
      participant = await this.prisma.participant.findFirst({
        where: {
          tenantId,
          eventId,
          AND: andFilters,
        },
      });
    } else if (participantIdentity) {
      participant = await this.prisma.participant.findFirst({
        where: {
          tenantId,
          eventId,
          OR: [
            { uniqueKey: participantIdentity },
            { employeeId: participantIdentity },
            { email: participantIdentity },
            { username: participantIdentity },
          ],
        },
      });
    } else {
      return { checked_in: false, reason: 'participant_identity_required' };
    }

    if (!participant) {
      if (participantMode === 'checkin' && participantFields) {
        const displayName = participantFields.display_name?.trim();
        if (!displayName) {
          throw new BadRequestException('participant_fields_missing');
        }
        participant = await this.prisma.participant.create({
          data: {
            tenantId,
            eventId,
            displayName,
            uniqueKey: participantFields.unique_key?.trim() || null,
            employeeId: participantFields.employee_id?.trim() || null,
            email: participantFields.email?.trim() || null,
            username: participantFields.username?.trim() || null,
            department: participantFields.department?.trim() || null,
            title: participantFields.title?.trim() || null,
            orgPath: participantFields.org_path?.trim() || null,
            customField: participantFields.custom_field?.trim() || null,
          },
        });
      } else {
        throw new NotFoundException('participant not found');
      }
    }

    if (!participant.checkedInAt) {
      await this.prisma.participant.update({
        where: { id: participant.id },
        data: { checkedInAt: new Date() },
      });
    }

    if (event.checkinDeviceLimit && normalizedDeviceId) {
      await this.prisma.checkinDevice.upsert({
        where: {
          tenantId_eventId_deviceId: {
            tenantId,
            eventId,
            deviceId: normalizedDeviceId,
          },
        },
        create: {
          tenantId,
          eventId,
          deviceId: normalizedDeviceId,
          lastCheckinAt: now,
        },
        update: {
          lastCheckinAt: now,
          updatedAt: now,
        },
      });
    }

    return { checked_in: true, participant_id: participant.id };
  }
}
