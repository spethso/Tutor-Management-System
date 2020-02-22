import { arrayProp, DocumentType, modelOptions, plugin, post, prop } from '@typegoose/typegoose';
import mongooseAutoPopulate from 'mongoose-autopopulate';
import { CollectionName } from '../../helpers/CollectionName';
import { StudentDocument } from './student.model';
import { TutorialDocument, TutorialModel } from './tutorial.model';
import VirtualPopulation, { VirtualPopulationOptions } from '../plugins/VirtualPopulation';

/**
 * Populates the fields in the given TeamDocument. If no document is provided this functions does nothing.
 *
 * @param doc TeamDocument to populate.
 */
export async function populateTeamDocument(doc?: TeamDocument) {
  if (!doc) {
    return;
  }

  await doc.populate('students').execPopulate();
}

@plugin(mongooseAutoPopulate)
@plugin<VirtualPopulationOptions<TeamModel>>(VirtualPopulation, {
  populateDocument: populateTeamDocument,
})
@modelOptions({ schemaOptions: { collection: CollectionName.TEAM } })
export class TeamModel {
  @prop({ required: true })
  teamNo!: number;

  @prop({ required: true, autopopulate: true, ref: TutorialModel })
  tutorial!: TutorialDocument;

  @arrayProp({
    ref: 'StudentModel',
    foreignField: 'team',
    localField: '_id',
  })
  students!: StudentDocument[];
}

export type TeamDocument = DocumentType<TeamModel>;