import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { PdfController } from './pdf.controller';
import { AttendancePDFGenerator } from './subservices/PDFGenerator.attendance';
import { CredentialsPDFGenerator } from './subservices/PDFGenerator.credentials';
import { ScheinexamResultPDFGenerator } from './subservices/PDFGenerator.scheinexam';
import { ScheinResultsPDFGenerator } from './subservices/PDFGenerator.schein';
import { TutorialModule } from '../tutorial/tutorial.module';
import { UserModule } from '../user/user.module';
import { MarkdownPDFGenerator } from './subservices/PDFGenerator.markdown';

@Module({
  imports: [TutorialModule, UserModule],
  providers: [
    PdfService,
    AttendancePDFGenerator,
    CredentialsPDFGenerator,
    ScheinexamResultPDFGenerator,
    ScheinResultsPDFGenerator,
    MarkdownPDFGenerator,
  ],
  controllers: [PdfController],
})
export class PdfModule {}