import { HasId, NamedElement, TutorialInEntity } from './Common';
import { IAttendance } from './Attendance';
import { IGrading } from './Points';

export interface TeamInStudent extends HasId {
  teamNo: number;
}

export enum StudentStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  NO_SCHEIN_REQUIRED = 'NO_SCHEIN_REQUIRED',
}

export interface IStudent extends NamedElement {
  attendances: [string, IAttendance][];
  courseOfStudies?: string;
  email?: string;
  matriculationNo?: string;
  gradings: [string, IGrading][];
  presentationPoints: [string, number][];
  status: StudentStatus;
  team?: TeamInStudent;
  tutorial: TutorialInEntity;
  cakeCount: number;
}

export interface IStudentDTO {
  courseOfStudies?: string;
  email?: string;
  firstname: string;
  lastname: string;
  matriculationNo?: string;
  status: StudentStatus;
  team?: string;
  tutorial: string;
}

export interface ICakeCountDTO {
  cakeCount: number;
}
