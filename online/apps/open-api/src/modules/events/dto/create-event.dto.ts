export class CreateEventDto {
  name: string;
  requireFinishPrize?: boolean;
  participantMode?: string;
  requiredFields?: string[];
  checkinDeviceLimit?: boolean;
  customFieldLabel?: string;
}
