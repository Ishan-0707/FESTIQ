import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';
import { getCanonicalVerificationUrl } from '../utils/certificateStorage.js';

/**
 * Generates an official A4 landscape PDF certificate using PDFKit.
 * Uses neutral FESTIQ ecosystem language and adheres to Obsidian Gold & Sage design tokens.
 */
export function generateCertificatePdfStream(certificate) {
  const doc = new PDFDocument({
    size: [841.89, 595.28], // A4 Landscape (points)
    margins: { top: 36, bottom: 36, left: 36, right: 36 },
    info: {
      Title: `FESTIQ Certificate - ${certificate.recipientName}`,
      Author: 'Issued by FESTIQ · Campus Event Ecosystem',
      Subject: `Certificate of Participation for ${certificate.eventName}`,
      Keywords: 'FESTIQ, Certificate, Verified, Campus Events',
      CreationDate: new Date(certificate.issueDate || Date.now())
    }
  });

  const stream = new PassThrough();
  doc.pipe(stream);

  const width = 841.89;
  const height = 595.28;

  // 1. Background Fill (Deep Obsidian Canvas)
  doc.rect(0, 0, width, height).fill('#0C0D0E');

  // 2. Outer Decorative Gold Border
  doc.rect(20, 20, width - 40, height - 40)
    .lineWidth(2.5)
    .stroke('#D4AF62');

  // 3. Inner Delicate Border
  doc.rect(26, 26, width - 52, height - 52)
    .lineWidth(0.8)
    .stroke('#8A7137');

  // 4. Corner Ornaments
  const cornerSize = 14;
  // Top-left
  doc.moveTo(26, 26 + cornerSize).lineTo(26 + cornerSize, 26).stroke('#D4AF62');
  // Top-right
  doc.moveTo(width - 26, 26 + cornerSize).lineTo(width - 26 - cornerSize, 26).stroke('#D4AF62');
  // Bottom-left
  doc.moveTo(26, height - 26 - cornerSize).lineTo(26 + cornerSize, height - 26).stroke('#D4AF62');
  // Bottom-right
  doc.moveTo(width - 26, height - 26 - cornerSize).lineTo(width - 26 - cornerSize, height - 26).stroke('#D4AF62');

  // 5. Neutral Ecosystem Header
  doc.fontSize(11)
    .font('Helvetica-Bold')
    .fillColor('#D4AF62')
    .text('FESTIQ CAMPUS EVENT ECOSYSTEM', 0, 56, { align: 'center', characterSpacing: 2 });

  doc.fontSize(8.5)
    .font('Helvetica')
    .fillColor('#A3A3A3')
    .text('CAMPUS EVENT DISCOVERY & PARTICIPATION NETWORK', 0, 74, { align: 'center', characterSpacing: 1.5 });

  // 6. Ornamental Horizontal Divider
  const midX = width / 2;
  doc.moveTo(midX - 120, 96).lineTo(midX + 120, 96).lineWidth(0.8).stroke('#D4AF62');
  doc.circle(midX, 96, 2.5).fill('#D4AF62');

  // 7. Certificate Main Heading
  doc.fontSize(22)
    .font('Times-Bold')
    .fillColor('#F5F1E8')
    .text('CERTIFICATE OF PARTICIPATION', 0, 114, { align: 'center', characterSpacing: 1.5 });

  doc.fontSize(10)
    .font('Times-Italic')
    .fillColor('#A3A3A3')
    .text('& OFFICIAL EVENT RECOGNITION', 0, 142, { align: 'center', characterSpacing: 1 });

  // 8. Presentation Preamble
  doc.fontSize(12)
    .font('Times-Roman')
    .fillColor('#E5E5E5')
    .text('This credential is officially conferred upon', 0, 178, { align: 'center' });

  // 9. Recipient Name (Hero Element)
  const recipient = (certificate.recipientName || 'Student Attendee').toUpperCase();
  doc.fontSize(25)
    .font('Times-Bold')
    .fillColor('#D4AF62')
    .text(recipient, 0, 206, { align: 'center', characterSpacing: 1.2 });

  // Underline beneath recipient name
  const nameWidth = Math.min(width - 200, Math.max(260, recipient.length * 15));
  doc.moveTo(midX - nameWidth / 2, 238).lineTo(midX + nameWidth / 2, 238).lineWidth(1).stroke('#8A7137');

  // 10. Conferred Statement
  doc.fontSize(11.5)
    .font('Times-Roman')
    .fillColor('#E5E5E5')
    .text('for verified active participation and commendable engagement in the campus event', 0, 268, { align: 'center' });

  // 11. Event Title
  doc.fontSize(20)
    .font('Helvetica-Bold')
    .fillColor('#FFFFFF')
    .text(certificate.eventName || 'Campus Festival Event', 0, 294, { align: 'center' });

  // 12. Event Date & Context
  const formattedDate = certificate.eventDate || 'Campus Event 2026';
  doc.fontSize(10.5)
    .font('Helvetica')
    .fillColor('#B0B0B0')
    .text(`Conducted on ${formattedDate} · FESTIQ Campus Event Ecosystem`, 0, 326, { align: 'center' });

  // 13. Citation & Attribution
  doc.fontSize(9.5)
    .font('Times-Italic')
    .fillColor('#888888')
    .text(
      'Recorded in the official campus event attendance archives and verified through cryptographic pass issuance.',
      0,
      352,
      { align: 'center' }
    );

  // 14. Signatures / Authority Endorsement Section
  const footerY = 415;
  const leftColX = 100;
  const rightColX = width - 260;

  // Left Signatory (Event Convenor)
  doc.moveTo(leftColX, footerY).lineTo(leftColX + 160, footerY).lineWidth(0.8).stroke('#525252');
  doc.fontSize(10)
    .font('Helvetica-Bold')
    .fillColor('#E5E5E5')
    .text('Event Organizing Convenor', leftColX, footerY + 8, { width: 160, align: 'center' });
  doc.fontSize(8.5)
    .font('Helvetica')
    .fillColor('#888888')
    .text('FESTIQ Campus Festival Committee', leftColX, footerY + 22, { width: 160, align: 'center' });

  // Center Official Seal Medallion
  doc.circle(midX, footerY + 12, 28)
    .lineWidth(1.2)
    .stroke('#D4AF62');
  doc.circle(midX, footerY + 12, 24)
    .lineWidth(0.6)
    .stroke('#8A7137');
  doc.fontSize(7)
    .font('Helvetica-Bold')
    .fillColor('#D4AF62')
    .text('OFFICIAL', midX - 25, footerY + 3, { width: 50, align: 'center' });
  doc.fontSize(6)
    .font('Helvetica')
    .fillColor('#A3A3A3')
    .text('VERIFIED', midX - 25, footerY + 13, { width: 50, align: 'center' });

  // Right Signatory (Faculty / Board)
  doc.moveTo(rightColX, footerY).lineTo(rightColX + 160, footerY).lineWidth(0.8).stroke('#525252');
  doc.fontSize(10)
    .font('Helvetica-Bold')
    .fillColor('#E5E5E5')
    .text('Faculty Event Coordinator', rightColX, footerY + 8, { width: 160, align: 'center' });
  doc.fontSize(8.5)
    .font('Helvetica')
    .fillColor('#888888')
    .text('FESTIQ Operations Board', rightColX, footerY + 22, { width: 160, align: 'center' });

  // 15. Security & Public Verification Footer Bar
  const bottomBarY = height - 76;
  doc.rect(40, bottomBarY, width - 80, 42)
    .fillAndStroke('#121315', '#242528');

  // Left Meta: Certificate ID & Issue Date
  const issueDateFormatted = certificate.issueDate
    ? new Date(certificate.issueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : 'November 2026';

  doc.fontSize(8)
    .font('Helvetica-Bold')
    .fillColor('#D4AF62')
    .text(`CERTIFICATE ID:  ${certificate.id}`, 54, bottomBarY + 10);

  const authLabel = certificate.issuingAuthority || 'Issued by FESTIQ · Campus Event Ecosystem';
  doc.fontSize(7.5)
    .font('Helvetica')
    .fillColor('#8A8A8A')
    .text(`Issued: ${issueDateFormatted}  ·  Authority: ${authLabel}`, 54, bottomBarY + 24);

  // Right Meta: Canonical Environment-Aware Public Verification Link
  const canonicalUrl = getCanonicalVerificationUrl(certificate.id);
  doc.fontSize(8)
    .font('Helvetica-Bold')
    .fillColor('#D4AF62')
    .text('PUBLIC VERIFICATION:', width - 420, bottomBarY + 10, { width: 360, align: 'right' });

  doc.fontSize(7.5)
    .font('Helvetica')
    .fillColor('#A3A3A3')
    .text(canonicalUrl, width - 420, bottomBarY + 24, { width: 360, align: 'right' });

  doc.end();
  return stream;
}
