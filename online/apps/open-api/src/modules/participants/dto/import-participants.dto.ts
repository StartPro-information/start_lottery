export class ImportParticipantsDto {
  csv?: string;
  items?: Array<{
    displayName: string;
    uniqueKey?: string;
    employeeId?: string;
    email?: string;
    username?: string;
    department?: string;
    title?: string;
    orgPath?: string;
    customField?: string;
  }>;
}
