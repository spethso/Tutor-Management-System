import { Document, Model } from 'mongoose';
import { Attendance, AttendanceState, AttendanceDTO } from 'shared/dist/model/Attendance';
import { prop, Typegoose } from 'typegoose';
import { startOfDay } from 'date-fns';

export class AttendanceSchema extends Typegoose implements Omit<Attendance, 'id'> {
  @prop({ required: true })
  date!: Date;

  @prop()
  note?: string;

  @prop({ enum: AttendanceState })
  state?: AttendanceState;
}

export interface AttendanceDocument extends AttendanceSchema, Document {}

const AttendanceModel: Model<AttendanceDocument> = new AttendanceSchema().getModelForClass(
  AttendanceSchema
);

export function generateAttendanceDocumentFromDTO(dto: AttendanceDTO): AttendanceDocument {
  const date = startOfDay(new Date(dto.date));
  const attendance: Omit<AttendanceSchema, keyof Typegoose> = {
    date,
    state: dto.state || undefined,
    note: dto.note,
  };

  return new AttendanceModel(attendance);
}
