import { Student } from 'shared/dist/model/Student';
import scheincriteriaService from '../../../services/scheincriteria-service/ScheincriteriaService.class';
import { StatusCheckResponse } from '../Scheincriteria';
import {
  PossiblePercentageCriteria,
  possiblePercentageCriteriaSchema,
} from './PossiblePercentageCriteria';

export class AttendanceCriteria extends PossiblePercentageCriteria {
  constructor(percentage: boolean, valueNeeded: number) {
    super('attendance', percentage, valueNeeded);
  }

  isPassed(student: Student): boolean {
    throw new Error('Method not implemented.');
  }

  async checkCriteriaStatus(student: Student): Promise<StatusCheckResponse> {
    throw new Error('Method not implemented.');
  }
}

scheincriteriaService.registerBluePrint(
  new AttendanceCriteria(false, 0),
  possiblePercentageCriteriaSchema
);
