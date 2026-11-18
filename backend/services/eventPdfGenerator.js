import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PDF_CACHE_DIR = path.resolve(__dirname, '..', 'data', 'pdf-cache');

// Ensure cache directory exists
if (!fs.existsSync(PDF_CACHE_DIR)) {
  fs.mkdirSync(PDF_CACHE_DIR, { recursive: true });
}

/**
 * Clears cached PDF for a specific event when its data is modified
 */
export function invalidatePdfCache(eventId) {
  try {
    const filePath = path.join(PDF_CACHE_DIR, `event_${eventId}.pdf`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[PDF Generator] Invalidated cache for event ${eventId}`);
    }
  } catch (err) {
    console.warn(`[PDF Generator] Failed to invalidate cache for ${eventId}:`, err.message);
  }
}

/**
 * Generates or retrieves a cached PDF stream/buffer for an event
 */
export async function getOrGenerateEventPdf(event) {
  const cachePath = path.join(PDF_CACHE_DIR, `event_${event.id}.pdf`);

  // Check if fresh cache exists
  if (fs.existsSync(cachePath)) {
    const stats = fs.statSync(cachePath);
    const eventUpdated = event.updatedAt ? new Date(event.updatedAt).getTime() : 0;
    if (stats.mtimeMs >= eventUpdated) {
      return fs.createReadStream(cachePath);
    }
  }

  // Generate new PDF and save to cache
  await generateEventPdfFile(event, cachePath);
  return fs.createReadStream(cachePath);
}

/**
 * Generates the PDF document using PDFKit and saves to targetPath
 */
function generateEventPdfFile(event, targetPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 40, bottom: 45, left: 45, right: 45 },
      bufferPages: true,
      info: {
        Title: `${event.title} - Official Event Specification`,
        Author: 'FESTIQ Campus Events',
        Subject: `Event Specification, Rules, and Schedule for ${event.title}`,
        Keywords: `FESTIQ, ${event.category}, ${event.title}, Campus Event`
      }
    });

    const stream = fs.createWriteStream(targetPath);
    doc.pipe(stream);

    const pdf = event.pdfDetails || {};
    const primaryColor = '#111B17';
    const goldColor = '#947838';
    const darkTextColor = '#1F2937';
    const lightTextColor = '#4B5563';
    const subtleBg = '#F8FAFC';
    const subtleBorder = '#E2E8F0';

    // Helper: Section Heading with Gold Bar
    const renderSectionHeader = (title) => {
      // Check if near bottom of page
      if (doc.y > doc.page.height - 100) {
        doc.addPage();
      } else {
        doc.moveDown(0.6);
      }

      const startY = doc.y;
      // Gold accent bar
      doc.rect(45, startY, 4, 18).fill(goldColor);
      doc.fillColor(primaryColor)
        .font('Helvetica-Bold')
        .fontSize(12)
        .text(title.toUpperCase(), 56, startY + 2, { lineGap: 2 });
      
      doc.moveDown(0.6);
      doc.strokeColor(subtleBorder).lineWidth(0.75)
        .moveTo(45, doc.y)
        .lineTo(doc.page.width - 45, doc.y)
        .stroke();
      doc.moveDown(0.6);
    };

    // ==========================================
    // 1. HEADER & BRANDING
    // ==========================================
    // Top banner bar
    doc.rect(45, 38, doc.page.width - 90, 48).fill(primaryColor);
    doc.fillColor('#FFFFFF')
      .font('Helvetica-Bold')
      .fontSize(16)
      .text('FESTIQ', 58, 48, { characterSpacing: 2, continued: true })
      .font('Helvetica')
      .fontSize(9)
      .fillColor(goldColor)
      .text('   •   CAMPUS EVENT SPECIFICATION & PARTICIPANT GUIDE');

    doc.fillColor('#94A3B8')
      .font('Helvetica')
      .fontSize(8)
      .text('OFFICIAL COMPETITION DIRECTORY & DELEGATE HANDBOOK', 58, 68);

    doc.y = 96;

    // Category Pill & Title
    const catUpper = (event.category || 'GENERAL').toUpperCase();
    doc.rect(45, doc.y, 110, 16).fill('#E2E8F0');
    doc.fillColor('#334155').font('Helvetica-Bold').fontSize(8)
      .text(`${catUpper} DISCIPLINE`, 50, doc.y + 4, { width: 100, align: 'center' });

    doc.moveDown(0.8);

    doc.fillColor(primaryColor)
      .font('Helvetica-Bold')
      .fontSize(16)
      .text(event.title, 45, doc.y, { lineGap: 3 });

    if (event.tagline) {
      doc.fillColor(goldColor)
        .font('Helvetica-Oblique')
        .fontSize(10)
        .text(event.tagline, { lineGap: 4 });
    }

    doc.moveDown(0.5);

    // ==========================================
    // KEY FACTS SUMMARY TABLE
    // ==========================================
    const factsStartY = doc.y;
    const boxWidth = doc.page.width - 90;
    const colW = boxWidth / 2;

    doc.rect(45, factsStartY, boxWidth, 78)
      .fillAndStroke(subtleBg, subtleBorder);

    // Row 1: Date & Time | Venue
    doc.fillColor(goldColor).font('Helvetica-Bold').fontSize(8)
      .text('DATE & TIME:', 55, factsStartY + 8);
    doc.fillColor(darkTextColor).font('Helvetica').fontSize(8.5)
      .text(`${event.date}   •   ${event.time}`, 130, factsStartY + 8, { width: colW - 90 });

    doc.fillColor(goldColor).font('Helvetica-Bold').fontSize(8)
      .text('VENUE:', 45 + colW + 10, factsStartY + 8);
    doc.fillColor(darkTextColor).font('Helvetica').fontSize(8.5)
      .text(event.venue, 45 + colW + 75, factsStartY + 8, { width: colW - 85 });

    // Row 2: Organizer | Eligibility
    doc.fillColor(goldColor).font('Helvetica-Bold').fontSize(8)
      .text('ORGANIZER:', 55, factsStartY + 26);
    doc.fillColor(darkTextColor).font('Helvetica').fontSize(8.5)
      .text(event.organizer, 130, factsStartY + 26, { width: colW - 90 });

    doc.fillColor(goldColor).font('Helvetica-Bold').fontSize(8)
      .text('ELIGIBILITY:', 45 + colW + 10, factsStartY + 26);
    doc.fillColor(darkTextColor).font('Helvetica').fontSize(8.5)
      .text(pdf.registrationInfo?.eligibility || 'All enrolled college students', 45 + colW + 75, factsStartY + 26, { width: colW - 85 });

    // Row 3: Prize Pool | Registration Fee
    doc.fillColor(goldColor).font('Helvetica-Bold').fontSize(8)
      .text('PRIZE POOL:', 55, factsStartY + 44);
    doc.fillColor('#047857').font('Helvetica-Bold').fontSize(9)
      .text(event.prizePool || 'As Configured', 130, factsStartY + 44, { width: colW - 90 });

    doc.fillColor(goldColor).font('Helvetica-Bold').fontSize(8)
      .text('REG. FEE:', 45 + colW + 10, factsStartY + 44);
    const feeText = event.isPaid && event.feeAmount > 0
      ? `₹${event.feeAmount} ${event.feeType === 'per_team' ? 'per team' : 'per participant'}`
      : 'Free Admission';
    doc.fillColor(darkTextColor).font('Helvetica-Bold').fontSize(8.5)
      .text(feeText, 45 + colW + 75, factsStartY + 44, { width: colW - 85 });

    // Row 4: Capacity | Status
    doc.fillColor(goldColor).font('Helvetica-Bold').fontSize(8)
      .text('CAPACITY:', 55, factsStartY + 62);
    doc.fillColor(darkTextColor).font('Helvetica').fontSize(8.5)
      .text(`${event.capacity || 'Unlimited'} Participants`, 130, factsStartY + 62, { width: colW - 90 });

    doc.fillColor(goldColor).font('Helvetica-Bold').fontSize(8)
      .text('STATUS:', 45 + colW + 10, factsStartY + 62);
    doc.fillColor(darkTextColor).font('Helvetica').fontSize(8.5)
      .text(event.status || 'Open', 45 + colW + 75, factsStartY + 62, { width: colW - 85 });

    doc.y = factsStartY + 88;

    // ==========================================
    // 2. DETAILED EVENT DESCRIPTION
    // ==========================================
    renderSectionHeader('1. Detailed Event Overview & Objectives');

    const descText = pdf.detailedDescription || event.fullDescription || event.description;
    doc.fillColor(darkTextColor)
      .font('Helvetica')
      .fontSize(9.5)
      .text(descText, 45, doc.y, {
        align: 'justify',
        lineGap: 4,
        width: doc.page.width - 90
      });

    // ==========================================
    // 3. EVENT SCHEDULE & TIMELINE
    // ==========================================
    renderSectionHeader('2. Event Schedule & Milestone Timeline');

    const scheduleList = Array.isArray(pdf.schedule) && pdf.schedule.length > 0
      ? pdf.schedule
      : [
          { time: '09:00 AM', activity: 'Reporting Desk & Participant Verification' },
          { time: '09:45 AM', activity: 'Inaugural Briefing & Track Orientation' },
          { time: '10:30 AM', activity: 'Primary Competition Session' },
          { time: '01:00 PM', activity: 'Mid-Day Refreshment & Networking Break' },
          { time: '02:00 PM', activity: 'Final Competitive Showcase / Presentations' },
          { time: '05:00 PM', activity: 'Jury Evaluation & Awards Ceremony' }
        ];

    // Table Header
    let schedY = doc.y;
    doc.rect(45, schedY, doc.page.width - 90, 18).fill('#1E293B');
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8)
      .text('TIME', 55, schedY + 5)
      .text('ACTIVITY / MILESTONE SCHEDULE', 160, schedY + 5);
    schedY += 18;

    scheduleList.forEach((item, idx) => {
      if (schedY > doc.page.height - 70) {
        doc.addPage();
        schedY = 50;
      }
      const rowBg = idx % 2 === 0 ? '#FFFFFF' : subtleBg;
      doc.rect(45, schedY, doc.page.width - 90, 20).fillAndStroke(rowBg, subtleBorder);

      doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(8.5)
        .text(item.time || 'TBA', 55, schedY + 5, { width: 95 });

      doc.fillColor(darkTextColor).font('Helvetica').fontSize(8.5)
        .text(item.activity || 'Activity detail to be announced', 160, schedY + 5, {
          width: doc.page.width - 220
        });

      schedY += 20;
    });

    doc.y = schedY + 8;

    // ==========================================
    // 4. RULES & REGULATIONS
    // ==========================================
    renderSectionHeader('3. Rules, Eligibility & Code of Conduct');

    const rulesList = Array.isArray(pdf.rules) && pdf.rules.length > 0
      ? pdf.rules
      : [
          'Participants must present a valid university student identity card at check-in.',
          'All work presented must be original work developed for this competition.',
          'Participants must adhere to the campus code of conduct at all times.',
          'The evaluation panel\'s scoring and decisions are final and binding.'
        ];

    rulesList.forEach((rule, idx) => {
      if (doc.y > doc.page.height - 60) doc.addPage();
      const itemY = doc.y;
      doc.fillColor(goldColor).font('Helvetica-Bold').fontSize(9)
        .text(`${idx + 1}.`, 50, itemY);
      doc.fillColor(darkTextColor).font('Helvetica').fontSize(9)
        .text(rule, 68, itemY, {
          width: doc.page.width - 120,
          lineGap: 3
        });
      doc.moveDown(0.35);
    });

    // ==========================================
    // 5. PRIZE DISTRIBUTION & CERTIFIED RESULTS
    // ==========================================
    renderSectionHeader('4. Prize Allocation & Certified Results');

    const prizeDist = pdf.prizeDistribution || {};
    const winners = pdf.winners || {};

    let prizeY = doc.y;
    doc.rect(45, prizeY, doc.page.width - 90, 18).fill('#1E293B');
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8)
      .text('POSITION', 55, prizeY + 5)
      .text('CONFIGURED PRIZE / AWARD', 160, prizeY + 5)
      .text('CERTIFIED WINNER / STATUS', 340, prizeY + 5);
    prizeY += 18;

    const positions = [
      { pos: 'First Place (Winner)', prize: prizeDist.first || 'To be announced', winner: winners.first || 'To be announced after the event' },
      { pos: 'Second Place (Runner-up)', prize: prizeDist.second || 'To be announced', winner: winners.second || 'To be announced after the event' },
      { pos: 'Third Place (2nd Runner-up)', prize: prizeDist.third || 'To be announced', winner: winners.third || 'To be announced after the event' }
    ];

    positions.forEach((p, idx) => {
      const rowBg = idx % 2 === 0 ? '#FFFFFF' : subtleBg;
      doc.rect(45, prizeY, doc.page.width - 90, 22).fillAndStroke(rowBg, subtleBorder);

      doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(8.5)
        .text(p.pos, 55, prizeY + 6, { width: 100 });

      doc.fillColor('#047857').font('Helvetica-Bold').fontSize(8.5)
        .text(p.prize, 160, prizeY + 6, { width: 170 });

      doc.fillColor(lightTextColor).font('Helvetica-Oblique').fontSize(8.5)
        .text(p.winner, 340, prizeY + 6, { width: doc.page.width - 390 });

      prizeY += 22;
    });

    doc.y = prizeY + 4;
    doc.fillColor(lightTextColor).font('Helvetica-Oblique').fontSize(8)
      .text('Note: Individual prize awards and official winner citations are certified by the jury upon conclusion of the event.', 45, doc.y, { width: doc.page.width - 90 });

    // ==========================================
    // 6. REGISTRATION & FEE INFORMATION
    // ==========================================
    renderSectionHeader('5. Registration & Participant Guidelines');

    const regInfo = pdf.registrationInfo || {};
    const regGuidelines = [
      { label: 'Registration Fee & Model', val: `${feeText} (${event.feeType === 'per_team' ? 'Team Billing' : 'Individual Billing'})` },
      { label: 'Registration Deadline', val: regInfo.deadline || 'To be announced' },
      { label: 'Maximum Capacity', val: `${event.capacity || 'Unlimited'} Participants` },
      { label: 'Payment Instructions', val: regInfo.paymentInstructions || 'Free admission with RSVP or payment receipt required at desk.' },
      { label: 'Cancellation Policy', val: regInfo.cancellationPolicy || 'Cancellations allowed up to 24 hours prior to commencement.' }
    ];

    regGuidelines.forEach((item) => {
      if (doc.y > doc.page.height - 50) doc.addPage();
      const rY = doc.y;
      doc.fillColor(goldColor).font('Helvetica-Bold').fontSize(8.5)
        .text(item.label.toUpperCase() + ':', 50, rY, { width: 160 });
      doc.fillColor(darkTextColor).font('Helvetica').fontSize(8.5)
        .text(item.val, 215, rY, { width: doc.page.width - 265 });
      doc.moveDown(0.4);
    });

    // ==========================================
    // 7. PARTICIPANT INSTRUCTIONS
    // ==========================================
    renderSectionHeader('6. Participant Instructions & Requirements');

    const instructions = Array.isArray(pdf.participantInstructions) && pdf.participantInstructions.length > 0
      ? pdf.participantInstructions
      : [
          'Bring your college identity card and FESTIQ digital registration pass.',
          'Ensure you arrive at least 30 minutes before the scheduled reporting time.',
          'Certificates of merit and participation will be issued digitally following verified attendance.'
        ];

    instructions.forEach((inst, idx) => {
      if (doc.y > doc.page.height - 50) doc.addPage();
      const iY = doc.y;
      doc.fillColor(goldColor).font('Helvetica-Bold').fontSize(9)
        .text('•', 52, iY);
      doc.fillColor(darkTextColor).font('Helvetica').fontSize(8.5)
        .text(inst, 68, iY, { width: doc.page.width - 120, lineGap: 2 });
      doc.moveDown(0.3);
    });

    // ==========================================
    // 8. ORGANIZER & OFFICIAL CONTACT
    // ==========================================
    renderSectionHeader('7. Organizer & Official Inquiries');

    const contact = pdf.organizerContact || {};
    const orgY = doc.y;
    doc.rect(45, orgY, doc.page.width - 90, 48).fillAndStroke(subtleBg, subtleBorder);

    doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(9)
      .text(contact.department || event.organizer, 55, orgY + 8);

    doc.fillColor(darkTextColor).font('Helvetica').fontSize(8.5)
      .text(`Coordinator: ${contact.name || event.managerName || 'Coordination Desk'}   •   Email: ${contact.email || 'events@festiq.campus.edu'}   •   Phone: ${contact.phone || event.managerPhone || '+91 00000 00000'}`, 55, orgY + 22);

    doc.fillColor(lightTextColor).font('Helvetica-Oblique').fontSize(8)
      .text(contact.support || 'For queries regarding registration, accessibility or venue allocations, contact the coordination desk.', 55, orgY + 34);

    // ==========================================
    // RUNNING FOOTERS & PAGE NUMBERS
    // ==========================================
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);

      // Temporarily disable bottom margin trigger during footer drawing
      const prevBottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;

      const footerY = doc.page.height - 30;
      doc.strokeColor(subtleBorder).lineWidth(0.5)
        .moveTo(45, footerY)
        .lineTo(doc.page.width - 45, footerY)
        .stroke();

      // Running footer text
      doc.fillColor('#94A3B8').font('Helvetica').fontSize(7.5)
        .text('FESTIQ Campus Event Directory • Official Information Document', 45, footerY + 6, {
          width: 300,
          lineBreak: false
        });

      doc.fillColor('#64748B').font('Helvetica-Bold').fontSize(7.5)
        .text(`Page ${i + 1} of ${totalPages}`, doc.page.width - 145, footerY + 6, {
          width: 100,
          align: 'right',
          lineBreak: false
        });

      doc.page.margins.bottom = prevBottom;
    }

    doc.end();

    stream.on('finish', () => {
      resolve(targetPath);
    });

    stream.on('error', reject);
  });
}
