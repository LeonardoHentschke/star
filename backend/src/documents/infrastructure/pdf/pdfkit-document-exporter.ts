import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { Document } from '../../domain/document.entity';
import { PdfExporterPort } from '../../application/ports/pdf-exporter.port';

@Injectable()
export class PdfKitDocumentExporter implements PdfExporterPort {
  export(document: Document): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const pdf = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];
      pdf.on('data', (chunk) => chunks.push(chunk));
      pdf.on('end', () => resolve(Buffer.concat(chunks)));
      pdf.on('error', reject);

      pdf.fontSize(20).text(document.title);
      pdf
        .fontSize(10)
        .fillColor('gray')
        .text(`Período: ${document.period.start} a ${document.period.end}`);
      pdf.moveDown();

      if (document.executiveSummary) {
        pdf.fontSize(14).fillColor('black').text('Resumo executivo');
        pdf.moveDown(0.3);
        pdf.fontSize(11).text(document.executiveSummary);
        pdf.moveDown();
      }

      document.items.forEach((item, i) => {
        pdf.fontSize(13).fillColor('black').text(`${i + 1}. ${item.source.title}`);
        pdf.moveDown(0.2);
        pdf
          .fontSize(10)
          .fillColor('gray')
          .text(item.source.sourceType === 'jira' ? 'Origem: Jira' : 'Origem: Pull Request (GitHub)');
        pdf.moveDown(0.3);

        pdf.fontSize(11).fillColor('black');
        pdf.font('Helvetica-Bold').text('Situação: ', { continued: true }).font('Helvetica').text(item.star.situation ?? '—');
        pdf.font('Helvetica-Bold').text('Tarefa: ', { continued: true }).font('Helvetica').text(item.star.task ?? '—');
        pdf.font('Helvetica-Bold').text('Ação: ', { continued: true }).font('Helvetica').text(item.star.action ?? '—');
        pdf.font('Helvetica-Bold').text('Resultado: ', { continued: true }).font('Helvetica').text(item.star.result ?? '—');
        pdf.moveDown();
      });

      pdf.end();
    });
  }
}
