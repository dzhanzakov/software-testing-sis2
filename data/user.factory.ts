export interface User {
  firstName: string;
  lastName: string;
  dob: string; // YYYY-MM-DD
  country: string; // ISO code as used by the country <select>
  postalCode: string;
  houseNumber: string;
  street: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  password: string;
}

let counter = 0;

/** A fresh, never-used account. Unique per call, per worker and per run. */
export function createUser(overrides: Partial<User> = {}): User {
  const unique = `${Date.now()}${process.pid}${counter++}${Math.floor(Math.random() * 1e4)}`;
  return {
    firstName: 'Test',
    lastName: 'Student',
    dob: '1999-05-17',
    country: 'US',
    postalCode: '10001',
    houseNumber: '12',
    street: 'Test Street',
    city: 'New York',
    state: 'NY',
    phone: '5551234567',
    email: `student.${unique}@example.com`,
    password: 'Str0ng!Passw0rd#2026',
    ...overrides,
  };
}
