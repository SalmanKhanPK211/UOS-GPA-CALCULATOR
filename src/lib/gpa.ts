// UOS grading formula (matches original app):
//   marks < 50            => 0.00 (fail)
//   50 <= marks < 90      => 2.00 + (marks - 50) * 0.05
//   marks >= 90           => 4.00
export function gradePointForMarks(marks: number): number {
  if (!Number.isFinite(marks) || marks < 50) return 0;
  if (marks >= 90) return 4;
  return 2 + (marks - 50) * 0.05;
}

export function letterGrade(gp: number): string {
  if (gp >= 4) return "A";
  if (gp >= 3.5) return "A-";
  if (gp >= 3) return "B+";
  if (gp >= 2.5) return "B";
  if (gp >= 2) return "C";
  return "F";
}

export interface SubjectResult {
  subjectName: string;
  creditHours: number;
  marks: number;
  gradePoint: number;
  gradePoints: number; // gp * credits (unrounded)
}

export function calculateGPA(inputs: { subjectName: string; creditHours: number; marks: number }[]) {
  const results: SubjectResult[] = inputs.map((s) => {
    const gp = gradePointForMarks(s.marks);
    return {
      subjectName: s.subjectName,
      creditHours: s.creditHours,
      marks: s.marks,
      gradePoint: gp,
      gradePoints: gp * s.creditHours,
    };
  });
  const totalCredits = results.reduce((a, r) => a + r.creditHours, 0);
  const totalGradePoints = results.reduce((a, r) => a + r.gradePoints, 0);
  const gpa = totalCredits > 0 ? totalGradePoints / totalCredits : 0;
  return { results, totalCredits, totalGradePoints, gpa };
}

export interface SemesterInput {
  semester: number;
  gpa: number;
  creditHours: number;
  gradePoints?: number;
}

export function calculateCGPA(semesters: SemesterInput[]) {
  const rows = semesters.map((s) => ({
    ...s,
    // Prefer the semester's exact total grade points when available;
    // fall back to gpa * credits so old records still work.
    gradePoints:
      typeof s.gradePoints === "number" && Number.isFinite(s.gradePoints)
        ? s.gradePoints
        : s.gpa * s.creditHours,
  }));
  const totalCredits = rows.reduce((a, r) => a + r.creditHours, 0);
  const totalGradePoints = rows.reduce((a, r) => a + r.gradePoints, 0);
  const cgpa = totalCredits > 0 ? totalGradePoints / totalCredits : 0;
  return { rows, totalCredits, totalGradePoints, cgpa };
}
