import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

const TOTAL_ROWS = 110_500;

const COLUMNS = [
  { name: 'ID' },
  { name: 'First Name' },
  { name: 'Last Name' },
  { name: 'Email' },
  { name: 'City' },
  { name: 'Country' },
  { name: 'Department' },
  { name: 'Job Title' },
  { name: 'Salary' },
  { name: 'Start Date' },
];

const FIRST_NAMES = [
  'James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda',
  'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Charles', 'Karen', 'Daniel', 'Lisa', 'Matthew', 'Nancy',
  'Anthony', 'Betty', 'Mark', 'Margaret', 'Steven', 'Sandra', 'Paul', 'Ashley',
  'Andrew', 'Dorothy', 'Joshua', 'Kimberly', 'Kenneth', 'Emily', 'Kevin', 'Donna',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
];

const CITIES = [
  'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia',
  'San Antonio', 'San Diego', 'Dallas', 'Austin', 'London', 'Paris', 'Berlin',
  'Tokyo', 'Sydney', 'Toronto', 'Mumbai', 'Shanghai', 'Dubai', 'Singapore',
];

const COUNTRIES = [
  'USA', 'UK', 'France', 'Germany', 'Japan', 'Australia', 'Canada', 'India', 'China', 'UAE',
];

const DEPARTMENTS = [
  'Engineering', 'Sales', 'Marketing', 'Finance', 'HR', 'Operations',
  'Legal', 'Support', 'R&D', 'Product',
];

const JOB_TITLES = [
  'Software Engineer', 'Sales Manager', 'Marketing Analyst', 'Accountant',
  'HR Specialist', 'Operations Lead', 'Legal Counsel', 'Support Agent',
  'Research Scientist', 'Product Manager', 'Team Lead', 'Director',
  'VP', 'Intern', 'Consultant', 'Architect', 'Designer', 'QA Engineer',
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

@Injectable({ providedIn: 'root' })
export class MockDataService {

  private generateRow(i: number): Record<string, any> {
    const rand = seededRandom(42 + i);
    const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];

    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const year = 2015 + Math.floor(rand() * 11);
    const month = String(Math.floor(rand() * 12) + 1).padStart(2, '0');
    const day = String(Math.floor(rand() * 28) + 1).padStart(2, '0');

    return {
      'ID': i + 1,
      'First Name': firstName,
      'Last Name': lastName,
      'Email': `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`,
      'City': pick(CITIES),
      'Country': pick(COUNTRIES),
      'Department': pick(DEPARTMENTS),
      'Job Title': pick(JOB_TITLES),
      'Salary': Math.floor(rand() * 150000) + 30000,
      'Start Date': `${year}-${month}-${day}`,
    };
  }

  getInfo(): Observable<any> {
    return of({
      status: 200,
      columns: COLUMNS,
      totals: { TOTAL_ITEMS: TOTAL_ROWS },
    }).pipe(delay(300));
  }

  getPage(offset: number, pageSize: number): Observable<any> {
    const start = offset * pageSize;
    const end = Math.min(start + pageSize, TOTAL_ROWS);
    const rows: Record<string, any>[] = [];
    for (let i = start; i < end; i++) {
      rows.push(this.generateRow(i));
    }

    return of({ rows }).pipe(delay(150 + Math.random() * 200));
  }
}
