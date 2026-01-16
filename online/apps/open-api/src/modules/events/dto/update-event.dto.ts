export class UpdateEventDto {
  name?: string;
  requireFinishPrize?: boolean;
  participantMode?: string;
  requiredFields?: string[];
  checkinDeviceLimit?: boolean;
  customFieldLabel?: string;
}
