import { BadRequestException, Injectable } from '@nestjs/common';
import { SubExerciseDocument } from '../../database/models/exercise.model';
import { ExerciseGradingDocument, GradingDocument } from '../../database/models/grading.model';
import { SheetDocument } from '../../database/models/sheet.model';
import { convertExercisePointInfoToString, ExercisePointInfo } from '../../shared/model/Points';
import { getNameOfEntity } from '../../shared/util/helpers';
import { SheetService } from '../sheet/sheet.service';
import { StudentService } from '../student/student.service';
import { TeamID, TeamService } from '../team/team.service';

export interface SheetPointInfo {
  achieved: number;
  total: { must: number; bonus: number };
}

interface GeneratingParams {
  sheet: SheetDocument;
  grading: GradingDocument;
  nameOfEntity: string;
}

interface GenerateSubExTableParams {
  subexercises: SubExerciseDocument[];
  gradingForExercise: ExerciseGradingDocument;
}

interface SubExData {
  name: string;
  achieved: number;
  total: ExercisePointInfo;
}

@Injectable()
export class MarkdownService {
  constructor(
    private readonly teamService: TeamService,
    private readonly studentService: StudentService,
    private readonly sheetService: SheetService
  ) {}

  /**
   * Generates a markdown string for the grading of the given team for the given sheet.
   *
   * @param teamId TeamID of the team to get markdown for.
   * @param sheetId ID of the sheet.
   *
   * @returns Generated markdown.
   *
   * @throws `NotFoundException` - If either no team with the given ID or no sheet with the given ID could be found.
   * @throws `BadRequestException` - If the given team does not have any students or the students do not hold a grading for the given sheet.
   */
  async getMarkdownForTeamGrading(teamId: TeamID, sheetId: string): Promise<string> {
    const team = await this.teamService.findById(teamId);
    const sheet = await this.sheetService.findById(sheetId);

    if (team.students.length === 0) {
      throw new BadRequestException(`Can not generate markdown for an empty team.`);
    }

    // TODO: How to handle if the students have different gradings?!
    const grading = team.students[0].getGrading(sheet);

    if (!grading) {
      throw new BadRequestException(
        `There is no grading available of the given sheet for the students in the given team.`
      );
    }

    const teamName: string = team.students.map(s => s.lastname).join('');

    return this.generateMarkdownFromGrading({ sheet, grading, nameOfEntity: `Team ${teamName}` });
  }

  /**
   * Generates a markdown string for the grading of the given student for the given sheet.
   *
   * @param studentId ID of the student.
   * @param sheetId ID of the sheet.
   *
   * @returns Generated markdown.
   *
   * @throws `NotFoundException` - If either no student with the given ID or no sheet with the given ID could be found.
   * @throws `BadRequestException` - If the student does not hold a grading for the given sheet.
   */
  async getMarkdownForStudentGrading(studentId: string, sheetId: string): Promise<string> {
    const student = await this.studentService.findById(studentId);
    const sheet = await this.sheetService.findById(sheetId);
    const grading = student.getGrading(sheet);

    if (!grading) {
      throw new BadRequestException(
        `There is no grading available of the given sheet for the given student.`
      );
    }

    return this.generateMarkdownFromGrading({
      sheet,
      grading,
      nameOfEntity: getNameOfEntity(student),
    });
  }

  private generateMarkdownFromGrading({ sheet, grading, nameOfEntity }: GeneratingParams): string {
    const pointInfo: SheetPointInfo = { achieved: 0, total: { must: 0, bonus: 0 } };
    let exerciseMarkdown: string = '';

    sheet.exercises.forEach(exercise => {
      const gradingForExercise = grading.getExerciseGrading(exercise);

      if (!gradingForExercise) {
        // TODO: Handle correctly
        return;
      }

      const { pointInfo: total, subexercises } = exercise;
      const achieved = gradingForExercise.points;
      const exMaxPoints = convertExercisePointInfoToString(total);
      const subExTable = this.generateSubExerciseTable({ subexercises, gradingForExercise });

      pointInfo.achieved += achieved;
      pointInfo.total.must = total.must;
      pointInfo.total.bonus = total.bonus;

      exerciseMarkdown += `## Aufgabe ${exercise.exName} [${achieved} / ${exMaxPoints}]\n\n`;
      if (!!subExTable) {
        exerciseMarkdown += `${subExTable}\n\n`;
      }
      exerciseMarkdown += `${gradingForExercise.comment ?? ''}\n\n`;
    });

    const totalPointInfo = convertExercisePointInfoToString(pointInfo.total);
    const header = `# ${nameOfEntity}\n\n**Gesamt: ${pointInfo.achieved} / ${totalPointInfo}**`;

    return `${header}\n\n${exerciseMarkdown}`;
  }

  private generateSubExerciseTable(params: GenerateSubExTableParams): string {
    const subExData: SubExData[] = this.generateSubExerciseData(params);

    let subExTable = '';

    subExData.forEach(({ name }) => {
      subExTable += `|${name}`;
    });
    subExTable += '|\n';

    subExData.forEach(() => {
      subExTable += '|:-----:';
    });
    subExTable += '|\n';

    subExData.forEach(({ achieved, total }) => {
      const totalString = convertExercisePointInfoToString(total);
      subExTable += `|${achieved} / ${totalString}`;
    });
    subExTable += '|\n';

    return subExTable;
  }

  private generateSubExerciseData({
    subexercises,
    gradingForExercise,
  }: GenerateSubExTableParams): SubExData[] {
    return subexercises.reduce<SubExData[]>((data, subEx) => {
      const achieved = gradingForExercise.getGradingForSubexercise(subEx);

      data.push({
        name: subEx.exName,
        achieved: achieved ?? 0,
        total: subEx.pointInfo,
      });

      return data;
    }, []);
  }
}