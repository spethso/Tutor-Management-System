import { format } from 'date-fns';
import fs from 'fs';
import JSZip from 'jszip';
import path from 'path';
import puppeteer from 'puppeteer';
import { ScheincriteriaSummaryByStudents } from 'shared/dist/model/ScheinCriteria';
import { Student } from 'shared/dist/model/Student';
import { Tutorial } from 'shared/dist/model/Tutorial';
import { User } from 'shared/dist/model/User';
import showdown, { ShowdownExtension } from 'showdown';
import { getIdOfDocumentRef } from '../../helpers/documentHelpers';
import Logger from '../../helpers/Logger';
import { TeamDocument } from '../../model/documents/TeamDocument';
import { BadRequestError } from '../../model/Errors';
import scheincriteriaService from '../scheincriteria-service/ScheincriteriaService.class';
import sheetService from '../sheet-service/SheetService.class';
import studentService from '../student-service/StudentService.class';
import teamService from '../team-service/TeamService.class';
import tutorialService from '../tutorial-service/TutorialService.class';
import userService from '../user-service/UserService.class';
import githubMarkdownCSS from './css/githubMarkdown';
import { PointMap } from 'shared/dist/model/Points';

interface StudentData {
  matriculationNo: string;
  schein: string;
}

interface TeamCommentData {
  teamName: string;
  markdown: string;
}

class PdfService {
  private markdownConverter: showdown.Converter;

  constructor() {
    const noMoreParagraphs: ShowdownExtension = {
      type: 'output',
      filter: text => {
        const regex = /<\/?p>/gi;

        return text.replace(regex, '');
      },
    };

    this.markdownConverter = new showdown.Converter({
      ghCodeBlocks: true,
      omitExtraWLInCodeBlocks: true,
      extensions: [noMoreParagraphs],
    });

    this.markdownConverter.setFlavor('github');
  }

  public generateAttendancePDF(tutorialId: string, date: Date): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const tutorial = await tutorialService.getTutorialWithID(tutorialId);

        const body: string = await this.generateAttendanceHTML(tutorial, date);
        const html = this.putBodyInHtml(body);

        const buffer = await this.getPDFFromHTML(html);

        resolve(buffer);
      } catch (err) {
        reject(err);
      }
    });
  }

  public generateStudentScheinOverviewPDF(): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const [students, summaries] = await Promise.all([
          studentService.getAllStudents(),
          scheincriteriaService.getCriteriaResultsOfAllStudents(),
        ]);

        const body = await this.generateScheinStatusHTML(students, summaries);
        const html = this.putBodyInHtml(body);

        const buffer = await this.getPDFFromHTML(html);

        resolve(buffer);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async generateCredentialsPDF(): Promise<Buffer> {
    const users: User[] = await userService.getAllUsers();
    const body = await this.generateCredentialsHTML(users);
    const html = this.putBodyInHtml(body);

    const buffer = await this.getPDFFromHTML(html);

    return buffer;
  }

  public async generatePDFFromSingleComment(
    tutorialId: string,
    sheetId: string,
    teamId: string
  ): Promise<Buffer> {
    const [team] = await teamService.getDocumentWithId(tutorialId, teamId);
    const { markdown } = await this.generateMarkdownFromTeamComment({ team, tutorialId, sheetId });

    return this.generatePDFFromMarkdown(markdown);
  }

  public async generateZIPFromComments(
    tutorialId: string,
    sheetId: string
  ): Promise<NodeJS.ReadableStream> {
    const tutorial = await tutorialService.getDocumentWithID(tutorialId);
    const sheet = await sheetService.getDocumentWithId(sheetId);

    const commentsByTeam: TeamCommentData[] = [];
    const sheetNo = sheet.sheetNo.toString().padStart(2, '0');

    for (const team of tutorial.teams) {
      commentsByTeam.push(
        await this.generateMarkdownFromTeamComment({ team, tutorialId, sheetId })
      );
    }

    const files: { filename: string; payload: Buffer }[] = [];

    for (const comment of commentsByTeam) {
      files.push({
        filename: `Ex${sheetNo}_${comment.teamName}.pdf`, // TODO: Make template.
        payload: await this.generatePDFFromMarkdown(comment.markdown),
      });
    }

    const zip = new JSZip();

    files.forEach(({ filename, payload }) => {
      zip.file(filename, payload, { binary: true });
    });

    return zip.generateNodeStream({ type: 'nodebuffer' });
  }

  public async getMarkdownFromTeamComment(
    tutorialId: string,
    teamId: string,
    sheetId: string
  ): Promise<string> {
    const [team] = await teamService.getDocumentWithId(tutorialId, teamId);

    const { markdown } = await this.generateMarkdownFromTeamComment({
      team,
      sheetId,
      tutorialId,
    });

    return markdown;
  }

  private async generateMarkdownFromTeamComment({
    team,
    tutorialId,
    sheetId,
  }: {
    team: TeamDocument;
    tutorialId: string;
    sheetId: string;
  }): Promise<TeamCommentData> {
    const entries = await teamService.getPoints(tutorialId, team.id, sheetId);
    const students = await Promise.all(
      team.students.map(s => studentService.getDocumentWithId(getIdOfDocumentRef(s)))
    );

    const teamName = students.map(s => s.lastname).join('');
    const pointInfo = { achieved: 0, total: 0 };
    let exerciseMarkdown: string = '';

    entries.forEach(({ exName, entry, exMaxPoints }) => {
      const achievedPts = PointMap.getPointsOfEntry(entry);

      pointInfo.achieved += achievedPts;
      pointInfo.total += exMaxPoints;

      exerciseMarkdown += `## Aufgabe ${exName} [${achievedPts}/${exMaxPoints}]  \n\n${entry.comment}\n\n`;
    });

    const totalPointInfo = `**Gesamt: ${pointInfo.achieved} / ${pointInfo.total}**`;
    const markdown = `# ${teamName}\n\n${totalPointInfo}\n\n${exerciseMarkdown}`;

    return { teamName, markdown };
  }

  private async generatePDFFromMarkdown(markdown: string): Promise<Buffer> {
    const html = this.generateHTMLFromMarkdown(markdown);

    return await this.getPDFFromHTML(html);
  }

  private generateHTMLFromMarkdown(markdown: string): string {
    const body = this.markdownConverter.makeHtml(markdown);

    return this.putBodyInHtml(body);
  }

  private getAttendanceTemplate(): string {
    return this.getTemplate('attendance.html');
  }

  private getScheinStatusTemplate(): string {
    return this.getTemplate('scheinstatus.html');
  }

  private getCredentialsTemplate(): string {
    return this.getTemplate('credentials.html');
  }

  private getTemplate(filename: string): string {
    try {
      const filePath = path.join(process.cwd(), 'config', 'html', filename);

      return fs.readFileSync(filePath).toString();
    } catch {
      throw new BadRequestError(
        `No template file present for filename '${filename}' in ./config/tms folder`
      );
    }
  }

  private async generateAttendanceHTML(tutorial: Tutorial, date: Date): Promise<string> {
    if (!tutorial.tutor) {
      throw new BadRequestError(
        'Tutorial which attendance list should be generated does NOT have a tutor assigned.'
      );
    }

    const template = this.getAttendanceTemplate();

    const tutor = await userService.getUserWithId(tutorial.tutor);
    const students: Student[] = await Promise.all(
      tutorial.students.map(student => studentService.getStudentWithId(student))
    );
    // const substitutePart = isSubstituteTutor(tutorial, userData)
    //   ? `, Ersatztutor: ${getNameOfEntity(userData)}`
    //   : '';

    const tutorName = `${tutor.lastname}, ${tutor.firstname}`;

    const rows: string = students
      .map(
        student =>
          `<tr><td>${student.lastname}, ${student.firstname}</td><td width="50%"></td></tr>`
      )
      .join('');

    return this.fillAttendanceTemplate(template, tutorial.slot, tutorName, rows, date);
  }

  private async generateScheinStatusHTML(
    students: Student[],
    summaries: ScheincriteriaSummaryByStudents
  ): Promise<string> {
    const template = this.getScheinStatusTemplate();
    const studentDataToPrint: StudentData[] = this.getStudentDataToPrint(students, summaries);

    const rows: string[] = [];

    studentDataToPrint.forEach(data => {
      rows.push(`<tr><td>${data.matriculationNo}</td><td>${data.schein}</td></tr>`);
    });

    return this.fillScheinStatusTemplate(template, rows.join(''));
  }

  private async generateCredentialsHTML(users: User[]): Promise<string> {
    const template = this.getCredentialsTemplate();
    const rows: string[] = [];

    users.forEach(user => {
      const tempPwd = user.temporaryPassword || 'NO TMP PASSWORD';
      const nameOfUser = `${user.lastname}, ${user.firstname}`;

      rows.push(`<tr><td>${nameOfUser}</td><td>${user.username}</td><td>${tempPwd}</td></tr>`);
    });

    return this.fillCredentialsTemplate(template, rows.join(''));
  }

  private fillAttendanceTemplate(
    template: string,
    slot: string,
    tutorName: string,
    students: string,
    date: Date
  ): string {
    return this.prepareTemplate(template)
      .replace(/{{tutorialSlot}}/g, slot)
      .replace(/{{tutorName}}/g, tutorName)
      .replace(/{{students}}/g, students)
      .replace(/{{date.*}}/g, substring => {
        const dateFormat = substring.split(',').map(s => s.replace(/{{|}}/, ''))[1];

        try {
          if (dateFormat) {
            return format(date, dateFormat);
          } else {
            return date.toDateString();
          }
        } catch {
          return date.toDateString();
        }
      });
  }

  private fillScheinStatusTemplate(template: string, statuses: string): string {
    return this.prepareTemplate(template).replace(/{{statuses.*}}/g, substring => {
      const wordArray = substring.match(/(\[(\w|\s)*,(\w|\s)*\])/g);
      const replacements = { yes: 'yes', no: 'no' };

      if (wordArray && wordArray[0]) {
        const [yes, no] = wordArray[0]
          .replace(/\[|\]|/g, '')
          .replace(/,\s*/g, ',')
          .split(',');

        replacements.yes = yes || replacements.yes;
        replacements.no = no || replacements.no;
      }

      return this.prepareTemplate(statuses)
        .replace(/{{yes}}/g, replacements.yes)
        .replace(/{{no}}/g, replacements.no);
    });
  }

  private fillCredentialsTemplate(template: string, credentials: string): string {
    return this.prepareTemplate(template).replace(/{{credentials}}/g, credentials);
  }

  private getStudentDataToPrint(
    students: Student[],
    summaries: ScheincriteriaSummaryByStudents
  ): StudentData[] {
    const studentDataToPrint: { matriculationNo: string; schein: string }[] = [];

    students.forEach(student => {
      studentDataToPrint.push({
        matriculationNo: this.getShortenedMatrNo(student, students),
        schein: summaries[student.id].passed ? '{{yes}}' : '{{no}}',
      });
    });

    studentDataToPrint.sort((a, b) => a.matriculationNo.localeCompare(b.matriculationNo));

    return studentDataToPrint;
  }

  private getShortenedMatrNo(student: Student, students: Student[]): string {
    const otherStudents = students.filter(s => s.id !== student.id);
    const lengthOfNo = student.matriculationNo.length;

    for (let iteration = 1; iteration < lengthOfNo; iteration++) {
      const shortStudent = student.matriculationNo.substr(lengthOfNo - iteration, iteration);
      let isOkay = true;

      for (const otherStudent of otherStudents) {
        const shortOtherStudent = otherStudent.matriculationNo.substr(
          lengthOfNo - iteration,
          iteration
        );

        if (shortStudent === shortOtherStudent) {
          isOkay = false;
          break;
        }
      }

      if (isOkay) {
        return shortStudent.padStart(7, '*');
      }
    }

    return student.matriculationNo;
  }

  private prepareTemplate(template: string): string {
    return template
      .replace(/{{\s+/g, '{{')
      .replace(/\s+}}/g, '}}')
      .replace(/(?=<!--)([\s\S]*?)-->/gim, '');
  }

  private putBodyInHtml(body: string): string {
    return `<html><head><style>${this.getGithubMarkdownCSS()}</style><style>${this.getCustomCSS()}</style></head><body class="markdown-body">${body}</body></html>`;
  }

  private async getPDFFromHTML(html: string): Promise<Buffer> {
    let browser: puppeteer.Browser | undefined = undefined;

    Logger.debug('Starting browser...');
    Logger.debug(`\tExec path: ${process.env.TMS_PUPPETEER_EXEC_PATH}`);

    try {
      browser = await puppeteer.launch({
        args: ['--disable-dev-shm-usage'],
        executablePath: process.env.TMS_PUPPETEER_EXEC_PATH,
      });

      Logger.debug('Browser startet.');

      const page = await browser.newPage();
      Logger.debug('Page created.');

      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      Logger.debug('Page content loaded');

      const buffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '1cm',
          right: '1cm',
          bottom: '1cm',
          left: '1cm',
        },
      });

      Logger.debug('PDF created.');

      await browser.close();

      Logger.debug('Browser closed');

      return buffer;
    } catch (err) {
      if (browser) {
        browser.close();
      }

      Logger.error(JSON.stringify(err, null, 2));

      throw err;
    }
  }

  private getGithubMarkdownCSS(): string {
    return githubMarkdownCSS;
  }

  private getCustomCSS(): string {
    return '.markdown-body table { display: table; width: 100%; }';
  }
}

const pdfService = new PdfService();

export default pdfService;