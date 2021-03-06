import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ReturnModelType } from '@typegoose/typegoose';
import { DateTime } from 'luxon';
import { InjectModel } from 'nestjs-typegoose';
import { StudentDocument } from '../../database/models/student.model';
import {
  populateTutorialDocument,
  TutorialDocument,
  TutorialModel,
} from '../../database/models/tutorial.model';
import { UserDocument } from '../../database/models/user.model';
import { CRUDService } from '../../helpers/CRUDService';
import { Role } from '../../shared/model/Role';
import { ITutorial } from '../../shared/model/Tutorial';
import { UserService } from '../user/user.service';
import { SubstituteDTO, TutorialDTO } from './tutorial.dto';

@Injectable()
export class TutorialService implements CRUDService<ITutorial, TutorialDTO, TutorialDocument> {
  constructor(
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    @InjectModel(TutorialModel)
    private readonly tutorialModel: ReturnModelType<typeof TutorialModel>
  ) {}

  /**
   * @returns All tutorials saved in the database.
   */
  async findAll(): Promise<TutorialDocument[]> {
    const tutorials: TutorialDocument[] = await this.tutorialModel.find().exec();

    await Promise.all(tutorials.map(doc => populateTutorialDocument(doc)));

    return tutorials;
  }

  /**
   * Searches for a tutorial with the given ID and returns it.
   *
   * @param id ID to search for.
   *
   * @returns TutorialDocument with the given ID.
   *
   * @throws `NotFoundException` - If no tutorial with the given ID could be found.
   */
  async findById(id: string): Promise<TutorialDocument> {
    const tutorial: TutorialDocument | null = await this.tutorialModel.findById(id).exec();

    if (!tutorial) {
      throw new NotFoundException(`Tutorial with the ID ${id} could not be found.`);
    }

    return tutorial;
  }

  /**
   * Creates a new tutorial based on the given information.
   *
   * @param dto Information about the tutorial to create.
   *
   * @throws `NotFoundException` - If the tutor or any of the correctors could not be found.
   * @throws `BadRequestExpcetion` - If the tutor to be assigned does not have the TUTOR role or if any of the correctors to be assigned does not have the CORRECTOR role.
   *
   * @returns Created tutorial.
   */
  async create(dto: TutorialDTO): Promise<ITutorial> {
    await this.assertTutorialSlot(dto.slot);

    const { slot, tutorId, correctorIds, startTime, endTime, dates } = dto;
    const [tutor, correctors] = await Promise.all([
      tutorId ? this.userService.findById(tutorId) : undefined,
      Promise.all(correctorIds.map(id => this.userService.findById(id))),
    ]);

    this.assertTutorHasTutorRole(tutor);
    this.assertCorrectorsHaveCorrectorRole(correctors);

    const startDate = DateTime.fromISO(startTime);
    const endDate = DateTime.fromISO(endTime);

    const tutorial = new TutorialModel({
      slot,
      tutor,
      startTime: startDate,
      endTime: endDate,
      dates: dates.map(date => DateTime.fromISO(date)),
      correctors,
    });

    const created = await this.tutorialModel.create(tutorial);

    return created.toDTO();
  }

  /**
   * Updates the tutorial with the given information and returns the updated tutorial.
   *
   * @param id ID of the Tutorial to update.
   * @param dto Information to update the tutorial with.
   *
   * @returns Updated document.
   *
   * @throws `BadRequestExpcetion` - If the tutor to be assigned does not have the TUTOR role or if any of the correctors to be assigned does not have the CORRECTOR role.
   * @throws `NotFoundException` - If the tutorial with the given ID or if the tutor with the ID in the DTO or if any corrector with the ID in the DTO could NOT be found.
   */
  async update(id: string, dto: TutorialDTO): Promise<ITutorial> {
    const tutorial = await this.findById(id);
    const tutor = !!dto.tutorId ? await this.userService.findById(dto.tutorId) : undefined;
    const correctors = await Promise.all(
      dto.correctorIds.map(corrId => this.userService.findById(corrId))
    );

    this.assertTutorHasTutorRole(tutor);
    this.assertCorrectorsHaveCorrectorRole(correctors);

    tutorial.slot = dto.slot;
    tutorial.dates = dto.dates.map(date => DateTime.fromISO(date));
    tutorial.startTime = DateTime.fromISO(dto.startTime);
    tutorial.endTime = DateTime.fromISO(dto.endTime);

    tutorial.tutor = tutor;
    tutorial.correctors = correctors;

    const updatedTutorial = await tutorial.save();

    return updatedTutorial.toDTO();
  }

  /**
   * Deletes the given tutorial and returns it's document.
   *
   * However, a tutorial which still has one or more students assigned to it can _not_ be deleted.
   *
   * @param id ID of the tutorial to delete.
   *
   * @returns Document of the deleted tutorial.
   *
   * @throws `NotFoundException` - If no tutorial with the given ID could be found.
   * @throws `BadRequestException` - If the tutorial to delete still has one or more student assigned to it.
   */
  async delete(id: string): Promise<TutorialDocument> {
    const tutorial = await this.findById(id);

    if (tutorial.students.length > 0) {
      throw new BadRequestException(`A tutorial with students can NOT be deleted.`);
    }

    return tutorial.remove();
  }

  async setSubstitute(id: string, dto: SubstituteDTO): Promise<ITutorial> {
    const tutorial = await this.findById(id);
    const { dates, tutorId } = dto;

    if (!tutorId) {
      dates.forEach(date => tutorial.removeSubstitute(DateTime.fromISO(date)));
    } else {
      const tutor = await this.userService.findById(tutorId);
      this.assertTutorHasTutorRole(tutor);

      dates.forEach(date => tutorial.setSubstitute(DateTime.fromISO(date), tutor));
    }

    const updated = await tutorial.save();

    return updated.toDTO();
  }

  /**
   * Returns all students in the tutorial with the given ID.
   *
   * @param id ID of the tutorial to get the students of.
   *
   * @returns All students in the tutorial with the given ID.
   *
   * @throws `NotFoundException` - If no tutorial with the given ID could be found.
   */
  async getAllStudentsOfTutorial(id: string): Promise<StudentDocument[]> {
    const tutorial = await this.findById(id);

    return tutorial.students;
  }

  private assertTutorHasTutorRole(tutor?: UserDocument) {
    if (tutor && !tutor.roles.includes(Role.TUTOR)) {
      throw new BadRequestException('The tutor of a tutorial needs to have the TUTOR role.');
    }
  }

  private assertCorrectorsHaveCorrectorRole(correctors: UserDocument[]) {
    for (const doc of correctors) {
      if (!doc.roles.includes(Role.CORRECTOR)) {
        throw new BadRequestException(
          'The corrector of a tutorial needs to have the CORRECTOR role.'
        );
      }
    }
  }

  private async assertTutorialSlot(slot: string) {
    const tutorialWithSameSlot = await this.tutorialModel.findOne({ slot }).exec();

    if (!!tutorialWithSameSlot) {
      throw new BadRequestException(`A tutorial with the slot '${slot} already exists.`);
    }
  }
}
