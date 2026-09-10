export class GradeYear {
    grade: string | null = null;
    year: number | null = null;

    public static equals(gradeYear1: GradeYear, gradeYear2: GradeYear) {
        return gradeYear1.grade == gradeYear2.grade && gradeYear1.year == gradeYear2.year;
    }

    public static matches(partial: GradeYear, exact: GradeYear) {
        // 2._ contains 2.1 2.2 ...
        // _.1 contains 2.1 3.1 ...
        if (partial.grade && partial.grade != exact.grade)
            return false;
        if (partial.year && partial.year != exact.year)
            return false;
        return true;
    }

    public static toString(gradeYears: GradeYear[]): string {
        let str = "";

        for (let gradeYear of gradeYears) {
            if (str != "")
                str += ", ";
            if (gradeYear.grade)
                str += gradeYear.grade;
            if (gradeYear.year) {
                if (gradeYear.grade)
                    str += ".";
                str += gradeYear.year;
            }
        }

        return str;
    }
}